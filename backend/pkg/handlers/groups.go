package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"social-network/backend/pkg/sessions"
	"strconv"
	"strings"
	"time"
)

// GroupsHandler handles group-related endpoints.
type GroupsHandler struct {
	db            *sql.DB
	notifications *NotificationsHandler
}

// NewGroupsHandler creates a new GroupsHandler.
func NewGroupsHandler(db *sql.DB, notifications *NotificationsHandler) *GroupsHandler {
	return &GroupsHandler{db: db, notifications: notifications}
}

// CreateGroup creates a new group.
// POST /api/groups
func (h *GroupsHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Title == "" {
		http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec(
		"INSERT INTO groups (title, description, creator_id) VALUES (?, ?, ?)",
		req.Title, req.Description, userID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to create group"}`, http.StatusInternalServerError)
		return
	}

	groupID, _ := result.LastInsertId()

	// Add creator as accepted member
	h.db.Exec(
		"INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, 'accepted')",
		groupID, userID,
	)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"message": "group created successfully", "group_id": groupID})
}

// GetAllGroups returns all groups.
// GET /api/groups
func (h *GroupsHandler) GetAllGroups(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)

	rows, err := h.db.Query(
		`SELECT g.id, g.title, g.description, g.creator_id, g.created_at,
		u.first_name, u.last_name, COALESCE(u.avatar,''),
		(SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'accepted') as member_count,
		(SELECT COUNT(*) > 0 FROM group_members WHERE group_id = g.id AND user_id = ? AND status = 'accepted') as is_member
		FROM groups g
		JOIN users u ON u.id = g.creator_id
		ORDER BY g.created_at DESC`, userID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var groups []map[string]interface{}
	for rows.Next() {
		var id, creatorID, memberCount int
		var title, desc, createdAt, fn, ln, av string
		var isMember bool
		rows.Scan(&id, &title, &desc, &creatorID, &createdAt, &fn, &ln, &av, &memberCount, &isMember)
		groups = append(groups, map[string]interface{}{
			"id": id, "title": title, "description": desc, "creator_id": creatorID,
			"created_at": createdAt, "member_count": memberCount, "is_member": isMember,
			"creator": map[string]interface{}{"first_name": fn, "last_name": ln, "avatar": av},
		})
	}

	if groups == nil {
		groups = []map[string]interface{}{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"groups": groups})
}

// GetGroup returns a single group with its members and posts.
// GET /api/groups/{id}
func (h *GroupsHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)

	parts := strings.Split(r.URL.Path, "/")
	groupID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid group id"}`, http.StatusBadRequest)
		return
	}

	var id, creatorID int
	var title, desc, createdAt string
	err = h.db.QueryRow(
		`SELECT id, title, description, creator_id, created_at FROM groups WHERE id = ?`, groupID,
	).Scan(&id, &title, &desc, &creatorID, &createdAt)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"group not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	// Check membership
	var membershipStatus string
	h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&membershipStatus)

	// Get members
	members := h.getGroupMembers(groupID)

	// Get posts if member
	var posts []map[string]interface{}
	if membershipStatus == "accepted" || creatorID == userID {
		posts = h.getGroupPosts(groupID)
	}

	// Get events if member
	var events []map[string]interface{}
	if membershipStatus == "accepted" || creatorID == userID {
		events = h.getGroupEvents(groupID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"group": map[string]interface{}{
			"id": id, "title": title, "description": desc, "creator_id": creatorID,
			"created_at": createdAt, "membership_status": membershipStatus,
		},
		"members": members,
		"posts":   posts,
		"events":  events,
	})
}

// JoinGroup sends a request to join a group or auto-joins if invited.
// POST /api/groups/{id}/join
func (h *GroupsHandler) JoinGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	groupID, err := strconv.Atoi(parts[len(parts)-2]) // .../{id}/join
	if err != nil {
		http.Error(w, `{"error":"invalid group id"}`, http.StatusBadRequest)
		return
	}

	var existingStatus string
	err = h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&existingStatus)
	if err == nil {
		if existingStatus == "accepted" {
			json.NewEncoder(w).Encode(map[string]interface{}{"message": "already a member", "status": "accepted"})
			return
		}
		if existingStatus == "invited" {
			h.db.Exec("UPDATE group_members SET status = 'accepted' WHERE group_id = ? AND user_id = ?", groupID, userID)
			json.NewEncoder(w).Encode(map[string]interface{}{"message": "joined group", "status": "accepted"})
			return
		}
		if existingStatus == "requested" {
			json.NewEncoder(w).Encode(map[string]interface{}{"message": "request already sent", "status": "requested"})
			return
		}
	}

	// Send join request
	h.db.Exec("INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, 'requested')", groupID, userID)

	// Notify group creator
	var creatorID int
	h.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if h.notifications != nil && creatorID > 0 {
		h.notifications.CreateNotification(creatorID, "group_join_request", "Someone wants to join your group", userID, groupID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "join request sent", "status": "requested"})
}

// AcceptGroupMember accepts a join request.
// POST /api/groups/{id}/accept/{userId}
func (h *GroupsHandler) AcceptGroupMember(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	groupID, _ := strconv.Atoi(parts[len(parts)-3])
	targetUserID, _ := strconv.Atoi(parts[len(parts)-1])

	// Verify requester is creator
	var creatorID int
	h.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if creatorID != userID {
		http.Error(w, `{"error":"only the group creator can accept members"}`, http.StatusForbidden)
		return
	}

	_, err := h.db.Exec(
		"UPDATE group_members SET status = 'accepted' WHERE group_id = ? AND user_id = ? AND status = 'requested'",
		groupID, targetUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "member accepted"})
}

// DeclineGroupMember declines a join request.
// POST /api/groups/{id}/decline/{userId}
func (h *GroupsHandler) DeclineGroupMember(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	groupID, _ := strconv.Atoi(parts[len(parts)-3])
	targetUserID, _ := strconv.Atoi(parts[len(parts)-1])

	var creatorID int
	h.db.QueryRow("SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if creatorID != userID {
		http.Error(w, `{"error":"only the group creator can decline members"}`, http.StatusForbidden)
		return
	}

	h.db.Exec("DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'requested'", groupID, targetUserID)

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "member declined"})
}

// InviteToGroup invites a user to join a group.
// POST /api/groups/{id}/invite
func (h *GroupsHandler) InviteToGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	groupID, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, `{"error":"invalid group id"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		UserID int `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Verify sender is a member
	var membershipStatus string
	h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&membershipStatus)
	if membershipStatus != "accepted" {
		http.Error(w, `{"error":"only members can invite others"}`, http.StatusForbidden)
		return
	}

	// Check if already invited/member
	var existing string
	err = h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, req.UserID).Scan(&existing)
	if err == nil && existing == "accepted" {
		json.NewEncoder(w).Encode(map[string]interface{}{"message": "user is already a member"})
		return
	}

	if err == sql.ErrNoRows {
		h.db.Exec("INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, 'invited')", groupID, req.UserID)
	} else {
		h.db.Exec("UPDATE group_members SET status = 'invited' WHERE group_id = ? AND user_id = ?", groupID, req.UserID)
	}

	if h.notifications != nil {
		h.notifications.CreateNotification(req.UserID, "group_invite", "You've been invited to join a group", userID, groupID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "invitation sent"})
}

// CreateGroupPost creates a post in a group.
// POST /api/groups/{id}/posts
func (h *GroupsHandler) CreateGroupPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	groupID, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, `{"error":"invalid group id"}`, http.StatusBadRequest)
		return
	}

	// Verify membership
	var status string
	h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&status)
	if status != "accepted" {
		http.Error(w, `{"error":"only members can post"}`, http.StatusForbidden)
		return
	}

	var req struct {
		Content string `json:"content"`
		Image   string `json:"image"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"content is required"}`, http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec(
		"INSERT INTO group_posts (group_id, user_id, content, image) VALUES (?, ?, ?, ?)",
		groupID, userID, req.Content, req.Image,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to create post"}`, http.StatusInternalServerError)
		return
	}

	postID, _ := result.LastInsertId()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"message": "post created", "post_id": postID})
}

// CreateGroupEvent creates an event in a group.
// POST /api/groups/{id}/events
func (h *GroupsHandler) CreateGroupEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	groupID, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, `{"error":"invalid group id"}`, http.StatusBadRequest)
		return
	}

	var status string
	h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&status)
	if status != "accepted" {
		http.Error(w, `{"error":"only members can create events"}`, http.StatusForbidden)
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		DayTime     string `json:"day_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.DayTime == "" {
		http.Error(w, `{"error":"title and day_time are required"}`, http.StatusBadRequest)
		return
	}

	eventTime, err := time.Parse(time.RFC3339, req.DayTime)
	if err != nil {
		http.Error(w, `{"error":"invalid date format, use RFC3339"}`, http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec(
		"INSERT INTO group_events (group_id, title, description, day_time, creator_id) VALUES (?, ?, ?, ?, ?)",
		groupID, req.Title, req.Description, eventTime, userID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to create event"}`, http.StatusInternalServerError)
		return
	}

	eventID, _ := result.LastInsertId()

	// Notify all group members
	if h.notifications != nil {
		rows, _ := h.db.Query("SELECT user_id FROM group_members WHERE group_id = ? AND status = 'accepted' AND user_id != ?", groupID, userID)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var uid int
				rows.Scan(&uid)
				h.notifications.CreateNotification(uid, "event_created", "New event: "+req.Title, userID, groupID)
			}
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"message": "event created", "event_id": eventID})
}

// RespondToEvent allows a user to respond to an event.
// POST /api/events/{id}/respond
func (h *GroupsHandler) RespondToEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	eventID, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, `{"error":"invalid event id"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Response != "going" && req.Response != "not_going" {
		http.Error(w, `{"error":"response must be 'going' or 'not_going'"}`, http.StatusBadRequest)
		return
	}

	h.db.Exec(
		"INSERT OR REPLACE INTO event_responses (event_id, user_id, response) VALUES (?, ?, ?)",
		eventID, userID, req.Response,
	)

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "response recorded"})
}

// AddGroupPostComment adds a comment to a group post.
// POST /api/groups/posts/{postId}/comment
func (h *GroupsHandler) AddGroupPostComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	postID, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
		return
	}

	// Verify user is member of the group
	var groupID int
	h.db.QueryRow("SELECT group_id FROM group_posts WHERE id = ?", postID).Scan(&groupID)

	var status string
	h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&status)
	if status != "accepted" {
		http.Error(w, `{"error":"only members can comment"}`, http.StatusForbidden)
		return
	}

	var req struct {
		Content string `json:"content"`
		Image   string `json:"image"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"content is required"}`, http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec(
		"INSERT INTO group_post_comments (group_post_id, user_id, content, image) VALUES (?, ?, ?, ?)",
		postID, userID, req.Content, req.Image,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to add comment"}`, http.StatusInternalServerError)
		return
	}

	commentID, _ := result.LastInsertId()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"message": "comment added", "comment_id": commentID})
}

// GetGroupPostComments returns all comments for a group post.
// GET /api/groups/posts/{postId}/comments
func (h *GroupsHandler) GetGroupPostComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	postID, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
		return
	}

	// Verify user is member of the group
	var groupID int
	h.db.QueryRow("SELECT group_id FROM group_posts WHERE id = ?", postID).Scan(&groupID)

	var status string
	h.db.QueryRow("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", groupID, userID).Scan(&status)
	if status != "accepted" {
		http.Error(w, `{"error":"only members can view comments"}`, http.StatusForbidden)
		return
	}

	comments := h.getGroupPostComments(postID)

	json.NewEncoder(w).Encode(map[string]interface{}{"comments": comments})
}

// --- Private helpers ---

func (h *GroupsHandler) getGroupMembers(groupID int) []map[string]interface{} {
	rows, err := h.db.Query(
		`SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar,''), gm.status
		FROM group_members gm JOIN users u ON u.id = gm.user_id
		WHERE gm.group_id = ? AND gm.status = 'accepted'`, groupID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var members []map[string]interface{}
	for rows.Next() {
		var id int
		var fn, ln, av, status string
		rows.Scan(&id, &fn, &ln, &av, &status)
		members = append(members, map[string]interface{}{
			"id": id, "first_name": fn, "last_name": ln, "avatar": av, "status": status,
		})
	}
	return members
}

func (h *GroupsHandler) getGroupPosts(groupID int) []map[string]interface{} {
	rows, err := h.db.Query(
		`SELECT gp.id, gp.content, COALESCE(gp.image,''), gp.created_at,
		u.id, u.first_name, u.last_name, COALESCE(u.avatar,''),
		(SELECT COUNT(*) FROM group_post_comments WHERE group_post_id = gp.id) as comment_count
		FROM group_posts gp JOIN users u ON u.id = gp.user_id
		WHERE gp.group_id = ? ORDER BY gp.created_at DESC`, groupID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var posts []map[string]interface{}
	for rows.Next() {
		var id, uid, commentCount int
		var content, img, createdAt, fn, ln, av string
		rows.Scan(&id, &content, &img, &createdAt, &uid, &fn, &ln, &av, &commentCount)
		posts = append(posts, map[string]interface{}{
			"id": id, "content": content, "image": img, "created_at": createdAt,
			"user": map[string]interface{}{"id": uid, "first_name": fn, "last_name": ln, "avatar": av},
			"comment_count": commentCount,
		})
	}
	return posts
}

func (h *GroupsHandler) getGroupPostComments(postID int) []map[string]interface{} {
	rows, err := h.db.Query(
		`SELECT gpc.id, gpc.content, COALESCE(gpc.image,''), gpc.created_at,
		u.id, u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,'')
		FROM group_post_comments gpc
		JOIN users u ON u.id = gpc.user_id
		WHERE gpc.group_post_id = ?
		ORDER BY gpc.created_at ASC`, postID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var comments []map[string]interface{}
	for rows.Next() {
		var id, uid int
		var content, img, createdAt, fn, ln, av, nn string
		rows.Scan(&id, &content, &img, &createdAt, &uid, &fn, &ln, &av, &nn)
		comments = append(comments, map[string]interface{}{
			"id": id, "content": content, "image": img, "created_at": createdAt,
			"user": map[string]interface{}{
				"id": uid, "first_name": fn, "last_name": ln, "avatar": av, "nickname": nn,
			},
		})
	}
	return comments
}

func (h *GroupsHandler) getGroupEvents(groupID int) []map[string]interface{} {
	rows, err := h.db.Query(
		`SELECT e.id, e.title, e.description, e.day_time, e.creator_id,
		u.first_name, u.last_name
		FROM group_events e JOIN users u ON u.id = e.creator_id
		WHERE e.group_id = ? ORDER BY e.day_time ASC`, groupID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var events []map[string]interface{}
	for rows.Next() {
		var id, creatorID int
		var title, desc, dayTime, fn, ln string
		rows.Scan(&id, &title, &desc, &dayTime, &creatorID, &fn, &ln)
		events = append(events, map[string]interface{}{
			"id": id, "title": title, "description": desc, "day_time": dayTime,
			"creator": map[string]interface{}{"id": creatorID, "first_name": fn, "last_name": ln},
			"responses": h.getEventResponses(id),
		})
	}
	return events
}

func (h *GroupsHandler) getEventResponses(eventID int) []map[string]interface{} {
	rows, err := h.db.Query(
		`SELECT er.user_id, er.response, u.first_name, u.last_name
		FROM event_responses er JOIN users u ON u.id = er.user_id
		WHERE er.event_id = ?`, eventID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var responses []map[string]interface{}
	for rows.Next() {
		var uid int
		var resp, fn, ln string
		rows.Scan(&uid, &resp, &fn, &ln)
		responses = append(responses, map[string]interface{}{
			"user_id": uid, "response": resp, "first_name": fn, "last_name": ln,
		})
	}
	return responses
}