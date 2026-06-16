package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"social-network/backend/pkg/sessions"
	"social-network/backend/pkg/websocket"
)

// MessagesHandler handles private and group messaging.
type MessagesHandler struct {
	db  *sql.DB
	hub *websocket.Hub
}

// NewMessagesHandler creates a new MessagesHandler.
func NewMessagesHandler(db *sql.DB, hub *websocket.Hub) *MessagesHandler {
	return &MessagesHandler{db: db, hub: hub}
}

// messageRequest represents the JSON body for sending a message.
type messageRequest struct {
	ReceiverID int    `json:"receiver_id"`
	GroupID    int    `json:"group_id,omitempty"`
	Content    string `json:"content"`
}

// conversation represents a summary of a chat conversation.
type conversation struct {
	UserID       int       `json:"user_id"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Avatar       string    `json:"avatar,omitempty"`
	Nickname     string    `json:"nickname,omitempty"`
	LastMessage  string    `json:"last_message"`
	LastTime     time.Time `json:"last_time"`
	UnreadCount  int       `json:"unread_count"`
}

// SendMessage sends a private or group message.
// POST /api/messages
func (h *MessagesHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req messageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"content is required"}`, http.StatusBadRequest)
		return
	}

	if req.ReceiverID == 0 && req.GroupID == 0 {
		http.Error(w, `{"error":"receiver_id or group_id is required"}`, http.StatusBadRequest)
		return
	}

	// Insert message into database
	result, err := h.db.Exec(
		`INSERT INTO messages (sender_id, receiver_id, group_id, content) VALUES (?, ?, ?, ?)`,
		currentUserID, nullIfZero(req.ReceiverID), nullIfZero(req.GroupID), req.Content,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to send message"}`, http.StatusInternalServerError)
		return
	}

	msgID, _ := result.LastInsertId()

	// Broadcast via WebSocket if hub is available
	if h.hub != nil {
		wsMsg := &websocket.Message{
			Type:       websocket.TypePrivateMessage,
			SenderID:   currentUserID,
			ReceiverID: req.ReceiverID,
			GroupID:    req.GroupID,
			Body:       req.Content,
			Payload: map[string]interface{}{
				"message_id": msgID,
				"created_at": time.Now(),
			},
		}

		if req.GroupID != 0 {
			wsMsg.Type = websocket.TypeGroupMessage
			h.hub.SendToGroup(req.GroupID, wsMsg)
		} else if req.ReceiverID != 0 {
			// Send to both sender and receiver
			h.hub.SendToUser(req.ReceiverID, wsMsg)

			// Also send to the sender's own room so other tabs get it
			senderCopy := *wsMsg
			h.hub.SendToUser(currentUserID, &senderCopy)
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    "message sent successfully",
		"message_id": msgID,
	})
}

// GetConversation returns the message history between the current user and another user.
// GET /api/messages/{userId}
func (h *MessagesHandler) GetConversation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Extract the other user ID from the URL path: /api/messages/{userId}
	parts := strings.Split(strings.TrimRight(r.URL.Path, "/"), "/")
	otherUserID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	// Verify the other user exists
	var count int
	h.db.QueryRow("SELECT COUNT(*) FROM users WHERE id = ?", otherUserID).Scan(&count)
	if count == 0 {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	// Fetch messages between the two users
	rows, err := h.db.Query(
		`SELECT m.id, m.sender_id, m.receiver_id, m.group_id, m.content, m.created_at
		 FROM messages m
		 WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
		 ORDER BY m.created_at ASC`,
		currentUserID, otherUserID, otherUserID, currentUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type message struct {
		ID         int        `json:"id"`
		SenderID   int        `json:"sender_id"`
		ReceiverID *int       `json:"receiver_id"`
		GroupID    *int       `json:"group_id,omitempty"`
		Content    string     `json:"content"`
		CreatedAt  time.Time  `json:"created_at"`
	}

	var messages []message
	for rows.Next() {
		var msg message
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.GroupID, &msg.Content, &msg.CreatedAt); err != nil {
			continue
		}
		messages = append(messages, msg)
	}
	if messages == nil {
		messages = []message{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"messages": messages, "user_id": otherUserID})
}

// GetConversations lists all conversations for the current user.
// GET /api/messages/conversations
func (h *MessagesHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Get all unique conversations (other users the current user has exchanged messages with)
	rows, err := h.db.Query(
		`SELECT
			CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
			u.first_name, u.last_name, COALESCE(u.avatar, '') AS avatar, COALESCE(u.nickname, '') AS nickname,
			m.content AS last_message, m.created_at AS last_time
		 FROM messages m
		 JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
		 WHERE m.id IN (
		 	SELECT MAX(m2.id) FROM messages m2
		 	WHERE (m2.sender_id = ? AND m2.receiver_id IS NOT NULL)
		 	   OR (m2.receiver_id = ? AND m2.sender_id IS NOT NULL)
		 	GROUP BY CASE WHEN m2.sender_id = ? THEN m2.receiver_id ELSE m2.sender_id END
		 )
		 ORDER BY m.created_at DESC`,
		currentUserID, currentUserID, currentUserID, currentUserID, currentUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var conversations []conversation
	for rows.Next() {
		var c conversation
		if err := rows.Scan(&c.UserID, &c.FirstName, &c.LastName, &c.Avatar, &c.Nickname, &c.LastMessage, &c.LastTime); err != nil {
			continue
		}

		// Count unread messages (messages from the other user that haven't been read)
		h.db.QueryRow(
			`SELECT COUNT(*) FROM messages
			 WHERE sender_id = ? AND receiver_id = ? AND created_at > COALESCE(
			 	(SELECT MAX(created_at) FROM messages WHERE sender_id = ? AND receiver_id = ?), '1970-01-01'
			 )`,
			c.UserID, currentUserID, currentUserID, c.UserID,
		).Scan(&c.UnreadCount)

		conversations = append(conversations, c)
	}
	if conversations == nil {
		conversations = []conversation{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"conversations": conversations})
}

// GetGroupMessages returns messages for a group chat.
// GET /api/messages/group/{groupId}
func (h *MessagesHandler) GetGroupMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Extract group ID from URL path: /api/messages/group/{groupId}
	parts := strings.Split(strings.TrimRight(r.URL.Path, "/"), "/")
	groupID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid group id"}`, http.StatusBadRequest)
		return
	}

	// Verify the user is a member of this group
	var memberCount int
	h.db.QueryRow(
		"SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'",
		groupID, currentUserID,
	).Scan(&memberCount)
	if memberCount == 0 {
		http.Error(w, `{"error":"not a member of this group"}`, http.StatusForbidden)
		return
	}

	rows, err := h.db.Query(
		`SELECT m.id, m.sender_id, m.content, m.created_at,
				u.first_name, u.last_name, COALESCE(u.avatar, '') AS avatar
		 FROM messages m
		 JOIN users u ON u.id = m.sender_id
		 WHERE m.group_id = ?
		 ORDER BY m.created_at ASC`,
		groupID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type groupMessage struct {
		ID        int       `json:"id"`
		SenderID  int       `json:"sender_id"`
		Content   string    `json:"content"`
		CreatedAt time.Time `json:"created_at"`
		FirstName string    `json:"first_name"`
		LastName  string    `json:"last_name"`
		Avatar    string    `json:"avatar"`
	}

	var messages []groupMessage
	for rows.Next() {
		var msg groupMessage
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.Content, &msg.CreatedAt, &msg.FirstName, &msg.LastName, &msg.Avatar); err != nil {
			continue
		}
		messages = append(messages, msg)
	}
	if messages == nil {
		messages = []groupMessage{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"messages": messages, "group_id": groupID})
}

// nullIfZero returns nil if v is 0, otherwise returns &v.
// This is needed for nullable receiver_id and group_id in SQL.
func nullIfZero(v int) interface{} {
	if v == 0 {
		return nil
	}
	return v
}