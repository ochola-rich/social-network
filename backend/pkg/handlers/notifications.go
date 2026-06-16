package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"social-network/backend/pkg/models"
	"social-network/backend/pkg/sessions"
)

// NotificationsHandler handles notification-related endpoints.
type NotificationsHandler struct {
	db *sql.DB
}

// NewNotificationsHandler creates a new NotificationsHandler.
func NewNotificationsHandler(db *sql.DB) *NotificationsHandler {
	return &NotificationsHandler{db: db}
}

// CreateNotification inserts a new notification for a user.
func (h *NotificationsHandler) CreateNotification(userID int, notifType, content string, relatedUserID, relatedGroupID int) {
	h.db.Exec(
		"INSERT INTO notifications (user_id, type, content, related_user_id, related_group_id) VALUES (?, ?, ?, ?, ?)",
		userID, notifType, content, relatedUserID, relatedGroupID,
	)
}

// GetNotifications returns all notifications for the current user.
// GET /api/notifications
func (h *NotificationsHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(
		`SELECT id, user_id, type, content, related_user_id, related_group_id, is_read, created_at
		 FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
		userID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		var isRead int
		rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Content, &n.RelatedUserID, &n.RelatedGroupID, &isRead, &n.CreatedAt)
		n.IsRead = isRead == 1
		notifications = append(notifications, n)
	}

	if notifications == nil {
		notifications = []models.Notification{}
	}

	// Count unread
	var unreadCount int
	h.db.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", userID).Scan(&unreadCount)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"notifications":  notifications,
		"unread_count":   unreadCount,
	})
}

// MarkAsRead marks a notification as read.
// POST /api/notifications/read/{id}
func (h *NotificationsHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Parse notification ID from path
	parts := splitPath(r.URL.Path)
	notifID, _ := strconv.Atoi(parts[len(parts)-1])

	if notifID > 0 {
		h.db.Exec("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", notifID, userID)
	} else {
		// Mark all as read
		h.db.Exec("UPDATE notifications SET is_read = 1 WHERE user_id = ?", userID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "notifications marked as read",
	})
}

// MarkAllAsRead marks all notifications as read.
// POST /api/notifications/read-all
func (h *NotificationsHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	h.db.Exec("UPDATE notifications SET is_read = 1 WHERE user_id = ?", userID)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "all notifications marked as read",
	})
}

// splitPath splits a URL path by "/" and filters empty strings.
func splitPath(path string) []string {
	parts := make([]string, 0)
	current := ""
	for _, c := range path {
		if c == '/' {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else {
			current += string(c)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}