package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/models"
	"social-network/backend/pkg/sessions"
)

// ProfileHandler handles profile-related endpoints.
type ProfileHandler struct {
	db *sql.DB
}

// NewProfileHandler creates a new ProfileHandler.
func NewProfileHandler(db *sql.DB) *ProfileHandler {
	return &ProfileHandler{db: db}
}

// GetProfile returns a user's profile.
// GET /api/profile/{id}
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract user ID from URL path: /api/profile/{id}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}
	profileID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	currentUserID := sessions.GetUserIDFromRequest(r)

	// Get user
	var user models.User
	err = h.db.QueryRow(
		`SELECT id, email, first_name, last_name, date_of_birth, COALESCE(avatar,''), COALESCE(nickname,''), COALESCE(about_me,''), is_public, created_at
		 FROM users WHERE id = ?`,
		profileID,
	).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Avatar, &user.Nickname, &user.AboutMe, &user.IsPublic, &user.CreatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	// If profile is private, check if current user is a follower (or is the owner)
	if !user.IsPublic && currentUserID != profileID {
		var isFollower bool
		h.db.QueryRow(
			"SELECT COUNT(*) > 0 FROM followers WHERE follower_id = ? AND followee_id = ? AND status = 'accepted'",
			currentUserID, profileID,
		).Scan(&isFollower)

		if !isFollower {
			// Return limited info
			json.NewEncoder(w).Encode(map[string]interface{}{
				"user": map[string]interface{}{
					"id":        user.ID,
					"first_name": user.FirstName,
					"last_name": user.LastName,
					"avatar":    user.Avatar,
					"nickname":  user.Nickname,
					"is_public": false,
				},
				"is_private": true,
				"message":    "this profile is private",
			})
			return
		}
	}

	// Get follower/following counts
	var followerCount, followingCount int
	h.db.QueryRow("SELECT COUNT(*) FROM followers WHERE followee_id = ? AND status = 'accepted'", profileID).Scan(&followerCount)
	h.db.QueryRow("SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted'", profileID).Scan(&followingCount)

	// Get followers list
	followers := h.getFollowers(profileID)

	// Get following list
	following := h.getFollowing(profileID)

	// Get user posts
	posts := h.getUserPosts(profileID, currentUserID)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":            user,
		"follower_count":  followerCount,
		"following_count": followingCount,
		"followers":       followers,
		"following":       following,
		"posts":           posts,
	})
}

// UpdateProfile updates the current user's profile.
// PUT /api/profile
func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var updates struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Nickname  string `json:"nickname"`
		AboutMe   string `json:"about_me"`
		Avatar    string `json:"avatar"`
		IsPublic  *bool  `json:"is_public"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if updates.FirstName != "" {
		h.db.Exec("UPDATE users SET first_name = ? WHERE id = ?", updates.FirstName, userID)
	}
	if updates.LastName != "" {
		h.db.Exec("UPDATE users SET last_name = ? WHERE id = ?", updates.LastName, userID)
	}
	if updates.Nickname != "" {
		h.db.Exec("UPDATE users SET nickname = ? WHERE id = ?", updates.Nickname, userID)
	}
	if updates.AboutMe != "" {
		h.db.Exec("UPDATE users SET about_me = ? WHERE id = ?", updates.AboutMe, userID)
	}
	if updates.Avatar != "" {
		h.db.Exec("UPDATE users SET avatar = ? WHERE id = ?", updates.Avatar, userID)
	}
	if updates.IsPublic != nil {
		val := 0
		if *updates.IsPublic {
			val = 1
		}
		h.db.Exec("UPDATE users SET is_public = ? WHERE id = ?", val, userID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "profile updated successfully",
	})
}

// TogglePrivacy toggles the current user's profile privacy.
// POST /api/profile/privacy
func (h *ProfileHandler) TogglePrivacy(w http.ResponseWriter, r *http.Request) {
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
		IsPublic bool `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	val := 0
	if req.IsPublic {
		val = 1
	}
	h.db.Exec("UPDATE users SET is_public = ? WHERE id = ?", val, userID)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "privacy updated successfully",
		"is_public": req.IsPublic,
	})
}

func (h *ProfileHandler) getFollowers(userID int) []models.User {
	rows, err := h.db.Query(
		`SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,'')
		 FROM followers f
		 JOIN users u ON u.id = f.follower_id
		 WHERE f.followee_id = ? AND f.status = 'accepted'`,
		userID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var followers []models.User
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Avatar, &u.Nickname)
		followers = append(followers, u)
	}
	return followers
}

func (h *ProfileHandler) getFollowing(userID int) []models.User {
	rows, err := h.db.Query(
		`SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,'')
		 FROM followers f
		 JOIN users u ON u.id = f.followee_id
		 WHERE f.follower_id = ? AND f.status = 'accepted'`,
		userID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var following []models.User
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Avatar, &u.Nickname)
		following = append(following, u)
	}
	return following
}

func (h *ProfileHandler) getUserPosts(userID, currentUserID int) []models.Post {
	// User can see their own public, almost_private, and private posts they're included in
	// Others can see public posts, almost_private if they follow, private only if explicitly included
	var rows *sql.Rows
	var err error

	if userID == currentUserID {
		rows, err = h.db.Query(
			`SELECT p.id, p.user_id, p.title, p.content, COALESCE(p.image,''), p.privacy, p.created_at,
			        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
			 FROM posts p
			 WHERE p.user_id = ?
			 ORDER BY p.created_at DESC`,
			userID,
		)
	} else {
		// Check if current user follows the profile user
		var isFollower bool
		h.db.QueryRow(
			"SELECT COUNT(*) > 0 FROM followers WHERE follower_id = ? AND followee_id = ? AND status = 'accepted'",
			currentUserID, userID,
		).Scan(&isFollower)

		if isFollower {
			rows, err = h.db.Query(
				`SELECT p.id, p.user_id, p.title, p.content, COALESCE(p.image,''), p.privacy, p.created_at,
				        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
				 FROM posts p
				 WHERE p.user_id = ? AND (p.privacy = 'public' OR p.privacy = 'almost_private' OR
				       (p.privacy = 'private' AND EXISTS (SELECT 1 FROM post_privacy pp WHERE pp.post_id = p.id AND pp.user_id = ?)))
				 ORDER BY p.created_at DESC`,
				userID, currentUserID,
			)
		} else {
			rows, err = h.db.Query(
				`SELECT p.id, p.user_id, p.title, p.content, COALESCE(p.image,''), p.privacy, p.created_at,
				        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
				 FROM posts p
				 WHERE p.user_id = ? AND p.privacy = 'public'
				 ORDER BY p.created_at DESC`,
				userID,
			)
		}
	}

	if err != nil {
		return nil
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Image, &p.Privacy, &p.CreatedAt, &p.CommentCount)
		posts = append(posts, p)
	}
	return posts
}