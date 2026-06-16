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

// PostHandler handles post-related endpoints.
type PostHandler struct {
	db *sql.DB
}

// NewPostHandler creates a new PostHandler.
func NewPostHandler(db *sql.DB) *PostHandler {
	return &PostHandler{db: db}
}

// CreatePost creates a new post.
// POST /api/posts
func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
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
		Title   string `json:"title"`
		Content string `json:"content"`
		Image   string `json:"image"`
		Privacy string `json:"privacy"`
		UserIDs []int  `json:"user_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"content is required"}`, http.StatusBadRequest)
		return
	}

	// Validate privacy
	validPrivacy := map[string]bool{"public": true, "almost_private": true, "private": true}
	if !validPrivacy[req.Privacy] {
		req.Privacy = "public"
	}

	result, err := h.db.Exec(
		"INSERT INTO posts (user_id, title, content, image, privacy) VALUES (?, ?, ?, ?, ?)",
		userID, req.Title, req.Content, req.Image, req.Privacy,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to create post"}`, http.StatusInternalServerError)
		return
	}

	postID, _ := result.LastInsertId()

	// If private, add the specified users to post_privacy
	if req.Privacy == "private" && len(req.UserIDs) > 0 {
		for _, uid := range req.UserIDs {
			h.db.Exec(
				"INSERT OR IGNORE INTO post_privacy (post_id, user_id) VALUES (?, ?)",
				postID, uid,
			)
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "post created successfully",
		"post_id": postID,
	})
}

// GetFeed returns the news feed for the current user.
// GET /api/posts/feed
func (h *PostHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Get posts from:
	// 1. Public posts from all users
	// 2. Almost private posts from users the current user follows
	// 3. Private posts where the current user is explicitly included
	rows, err := h.db.Query(
		`SELECT p.id, p.user_id, p.title, p.content, COALESCE(p.image,''), p.privacy, p.created_at,
		        u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,''),
		        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
		 FROM posts p
		 JOIN users u ON u.id = p.user_id
		 WHERE p.privacy = 'public'
		    OR (p.privacy = 'almost_private' AND EXISTS (
		        SELECT 1 FROM followers f WHERE f.follower_id = ? AND f.followee_id = p.user_id AND f.status = 'accepted'
		    ))
		    OR (p.privacy = 'private' AND EXISTS (
		        SELECT 1 FROM post_privacy pp WHERE pp.post_id = p.id AND pp.user_id = ?
		    ))
		    OR p.user_id = ?
		 ORDER BY p.created_at DESC
		 LIMIT 50`,
		userID, userID, userID,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		var u models.User
		rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Image, &p.Privacy, &p.CreatedAt,
			&u.FirstName, &u.LastName, &u.Avatar, &u.Nickname, &p.CommentCount)
		u.ID = p.UserID
		p.User = &u
		posts = append(posts, p)
	}

	if posts == nil {
		posts = []models.Post{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"posts": posts,
	})
}

// GetPost returns a single post with its comments.
// GET /api/posts/{id}
func (h *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	parts := strings.Split(r.URL.Path, "/")
	postID, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
		return
	}

	var p models.Post
	var u models.User
	err = h.db.QueryRow(
		`SELECT p.id, p.user_id, p.title, p.content, COALESCE(p.image,''), p.privacy, p.created_at,
		        u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,''),
		        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
		 FROM posts p
		 JOIN users u ON u.id = p.user_id
		 WHERE p.id = ?`,
		postID,
	).Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Image, &p.Privacy, &p.CreatedAt,
		&u.FirstName, &u.LastName, &u.Avatar, &u.Nickname, &p.CommentCount)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"post not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	u.ID = p.UserID
	p.User = &u

	// Check privacy access
	if p.Privacy != "public" && p.UserID != userID {
		if p.Privacy == "almost_private" {
			var isFollower bool
			h.db.QueryRow(
				"SELECT COUNT(*) > 0 FROM followers WHERE follower_id = ? AND followee_id = ? AND status = 'accepted'",
				userID, p.UserID,
			).Scan(&isFollower)
			if !isFollower {
				http.Error(w, `{"error":"access denied"}`, http.StatusForbidden)
				return
			}
		} else if p.Privacy == "private" {
			var isIncluded bool
			h.db.QueryRow(
				"SELECT COUNT(*) > 0 FROM post_privacy WHERE post_id = ? AND user_id = ?",
				postID, userID,
			).Scan(&isIncluded)
			if !isIncluded {
				http.Error(w, `{"error":"access denied"}`, http.StatusForbidden)
				return
			}
		}
	}

	// Get comments
	comments := h.getComments(postID)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"post":     p,
		"comments": comments,
	})
}

// AddComment adds a comment to a post.
// POST /api/posts/{id}/comment
func (h *PostHandler) AddComment(w http.ResponseWriter, r *http.Request) {
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
	// Find the post ID in the path: /api/posts/{id}/comment
	var postID int
	for i, part := range parts {
		if part == "posts" && i+1 < len(parts) {
			postID, _ = strconv.Atoi(parts[i+1])
			break
		}
	}

	if postID == 0 {
		http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
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

	// Check if post exists
	var exists bool
	h.db.QueryRow("SELECT COUNT(*) > 0 FROM posts WHERE id = ?", postID).Scan(&exists)
	if !exists {
		http.Error(w, `{"error":"post not found"}`, http.StatusNotFound)
		return
	}

	result, err := h.db.Exec(
		"INSERT INTO comments (post_id, user_id, content, image) VALUES (?, ?, ?, ?)",
		postID, userID, req.Content, req.Image,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to add comment"}`, http.StatusInternalServerError)
		return
	}

	commentID, _ := result.LastInsertId()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    "comment added successfully",
		"comment_id": commentID,
	})
}

// SearchUsers searches for users by name or email.
// GET /api/users/search?q=...
func (h *PostHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, `{"error":"query parameter 'q' is required"}`, http.StatusBadRequest)
		return
	}

	searchTerm := "%" + query + "%"
	rows, err := h.db.Query(
		`SELECT id, first_name, last_name, email, COALESCE(avatar,''), COALESCE(nickname,'')
		 FROM users
		 WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR nickname LIKE ?
		 LIMIT 20`,
		searchTerm, searchTerm, searchTerm, searchTerm,
	)
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Email, &u.Avatar, &u.Nickname)
		users = append(users, u)
	}

	if users == nil {
		users = []models.User{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": users,
	})
}

func (h *PostHandler) getComments(postID int) []models.Comment {
	rows, err := h.db.Query(
		`SELECT c.id, c.post_id, c.user_id, c.content, COALESCE(c.image,''), c.created_at,
		        u.first_name, u.last_name, COALESCE(u.avatar,''), COALESCE(u.nickname,'')
		 FROM comments c
		 JOIN users u ON u.id = c.user_id
		 WHERE c.post_id = ?
		 ORDER BY c.created_at ASC`,
		postID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		var u models.User
		rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.Image, &c.CreatedAt,
			&u.FirstName, &u.LastName, &u.Avatar, &u.Nickname)
		u.ID = c.UserID
		c.User = &u
		comments = append(comments, c)
	}

	if comments == nil {
		comments = []models.Comment{}
	}

	return comments
}