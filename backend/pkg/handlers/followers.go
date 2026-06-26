package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/sessions"
)

// FollowHandler handles follow-related endpoints.
type FollowHandler struct {
	db            *sql.DB
	notifications *NotificationsHandler
}

// NewFollowHandler creates a new FollowHandler.
func NewFollowHandler(db *sql.DB, notifications *NotificationsHandler) *FollowHandler {
	return &FollowHandler{db: db, notifications: notifications}
}

// SendFollowRequest sends a follow request to a user.
// POST /api/follow/request/{userId}
func (h *FollowHandler) SendFollowRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	targetID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	if currentUserID == targetID {
		http.Error(w, `{"error":"cannot follow yourself"}`, http.StatusBadRequest)
		return
	}

	var isPublic bool
	err = h.db.QueryRow("SELECT is_public FROM users WHERE id = ?", targetID).Scan(&isPublic)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	var existingStatus string
	err = h.db.QueryRow(
		"SELECT status FROM followers WHERE follower_id = ? AND followee_id = ?",
		currentUserID, targetID,
	).Scan(&existingStatus)

	if err == nil {
		if existingStatus == "accepted" {
			json.NewEncoder(w).Encode(map[string]interface{}{"message": "already following this user", "status": "accepted"})
			return
		}
		if existingStatus == "pending" {
			json.NewEncoder(w).Encode(map[string]interface{}{"message": "follow request already sent", "status": "pending"})
			return
		}
	}

	if isPublic {
		if err == sql.ErrNoRows {
			h.db.Exec("INSERT INTO followers (follower_id, followee_id, status) VALUES (?, ?, 'accepted')", currentUserID, targetID)
		} else {
			h.db.Exec("UPDATE followers SET status = 'accepted' WHERE follower_id = ? AND followee_id = ?", currentUserID, targetID)
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"message": "now following user", "status": "accepted"})
	} else {
		if err == sql.ErrNoRows {
			h.db.Exec("INSERT INTO followers (follower_id, followee_id, status) VALUES (?, ?, 'pending')", currentUserID, targetID)
		} else {
			h.db.Exec("UPDATE followers SET status = 'pending' WHERE follower_id = ? AND followee_id = ?", currentUserID, targetID)
		}
		if h.notifications != nil {
			h.notifications.CreateNotification(targetID, "follow_request", "Someone wants to follow you", currentUserID, 0)
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"message": "follow request sent", "status": "pending"})
	}
}

// AcceptFollowRequest accepts a follow request.
// POST /api/follow/accept/{userId}
func (h *FollowHandler) AcceptFollowRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	followerID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec(
		"UPDATE followers SET status = 'accepted' WHERE follower_id = ? AND followee_id = ? AND status = 'pending'",
		followerID, currentUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
    // Return 200 OK instead of 404 to make the operation idempotent.
    // If it's already accepted, we just treat it as a success.
    json.NewEncoder(w).Encode(map[string]interface{}{"message": "follow request already accepted"})
    return
}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "follow request accepted"})
}

// DeclineFollowRequest declines a follow request.
// POST /api/follow/decline/{userId}
func (h *FollowHandler) DeclineFollowRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	followerID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec(
		"DELETE FROM followers WHERE follower_id = ? AND followee_id = ? AND status = 'pending'",
		followerID, currentUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "follow request declined"})
}

// Unfollow removes a follow relationship.
// POST /api/follow/unfollow/{userId}
func (h *FollowHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	targetID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec("DELETE FROM followers WHERE follower_id = ? AND followee_id = ?", currentUserID, targetID)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "unfollowed successfully"})
}

// GetPendingFollowRequests returns all pending follow requests for the current user.
// GET /api/follow/pending
func (h *FollowHandler) GetPendingFollowRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(
		`SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,'')
		 FROM followers f JOIN users u ON u.id = f.follower_id
		 WHERE f.followee_id = ? AND f.status = 'pending'`, currentUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var requests []map[string]interface{}
	for rows.Next() {
		var id int
		var fn, ln, av, nn string
		rows.Scan(&id, &fn, &ln, &av, &nn)
		requests = append(requests, map[string]interface{}{"id": id, "first_name": fn, "last_name": ln, "avatar": av, "nickname": nn})
	}
	if requests == nil {
		requests = []map[string]interface{}{}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"requests": requests})
}

// GetFollowers returns all followers of the current user.
// GET /api/follow/followers
func (h *FollowHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(
		`SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,'')
		 FROM followers f JOIN users u ON u.id = f.follower_id
		 WHERE f.followee_id = ? AND f.status = 'accepted'`, currentUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var followers []map[string]interface{}
	for rows.Next() {
		var id int
		var fn, ln, av, nn string
		rows.Scan(&id, &fn, &ln, &av, &nn)
		followers = append(followers, map[string]interface{}{"id": id, "first_name": fn, "last_name": ln, "avatar": av, "nickname": nn})
	}
	if followers == nil {
		followers = []map[string]interface{}{}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"followers": followers})
}

// GetFollowing returns all users the current user is following.
// GET /api/follow/following
func (h *FollowHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)
	if currentUserID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(
		`SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,'')
		 FROM followers f JOIN users u ON u.id = f.followee_id
		 WHERE f.follower_id = ? AND f.status = 'accepted'`, currentUserID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var following []map[string]interface{}
	for rows.Next() {
		var id int
		var fn, ln, av, nn string
		rows.Scan(&id, &fn, &ln, &av, &nn)
		following = append(following, map[string]interface{}{"id": id, "first_name": fn, "last_name": ln, "avatar": av, "nickname": nn})
	}
	if following == nil {
		following = []map[string]interface{}{}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"following": following})
}