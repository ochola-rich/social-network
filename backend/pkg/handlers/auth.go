package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"social-network/backend/pkg/models"
	"social-network/backend/pkg/sessions"

	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles authentication-related endpoints.
type AuthHandler struct {
	db      *sql.DB
	session *sessions.Store
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(db *sql.DB, session *sessions.Store) *AuthHandler {
	return &AuthHandler{db: db, session: session}
}

// Register handles user registration.
// POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	var errors []string
	if req.Email == "" {
		errors = append(errors, "email is required")
	}
	if req.Password == "" {
		errors = append(errors, "password is required")
	}
	if req.FirstName == "" {
		errors = append(errors, "first_name is required")
	}
	if req.LastName == "" {
		errors = append(errors, "last_name is required")
	}
	if req.DateOfBirth == "" {
		errors = append(errors, "date_of_birth is required")
	}

	if len(errors) > 0 {
		resp := map[string]interface{}{"error": "validation failed", "fields": errors}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(resp)
		return
	}

	var existingID int
	err := h.db.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&existingID)
	if err == nil {
		http.Error(w, `{"error":"email already registered"}`, http.StatusConflict)
		return
	} else if err != sql.ErrNoRows {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"error":"failed to hash password"}`, http.StatusInternalServerError)
		return
	}

	if _, err := time.Parse("2006-01-02", req.DateOfBirth); err != nil {
		if _, err := time.Parse("02/01/2006", req.DateOfBirth); err != nil {
			http.Error(w, `{"error":"invalid date format, use YYYY-MM-DD"}`, http.StatusBadRequest)
			return
		}
	}

	result, err := h.db.Exec(
		`INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, avatar, nickname, about_me)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		req.Email, string(hashedPassword), req.FirstName, req.LastName, req.DateOfBirth,
		req.Avatar, req.Nickname, req.AboutMe,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to create user"}`, http.StatusInternalServerError)
		return
	}

	userID, _ := result.LastInsertId()
	if _, err := h.session.Create(w, int(userID)); err != nil {
		http.Error(w, `{"error":"failed to create session"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"message": "user registered successfully", "user_id": userID})
}

// Login handles user login.
// POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, `{"error":"email and password are required"}`, http.StatusBadRequest)
		return
	}

	var user models.User
	err := h.db.QueryRow(
		"SELECT id, email, password_hash, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_public FROM users WHERE email = ?",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Avatar, &user.Nickname, &user.AboutMe, &user.IsPublic)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"invalid email or password"}`, http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, `{"error":"invalid email or password"}`, http.StatusUnauthorized)
		return
	}

	if _, err := h.session.Create(w, user.ID); err != nil {
		http.Error(w, `{"error":"failed to create session"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "login successful", "user": user})
}

// Logout handles user logout.
// POST /api/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	if err := h.session.Delete(w, r); err != nil {
		http.Error(w, `{"error":"failed to logout"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"message": "logged out successfully"})
}

// Me returns the currently authenticated user.
// GET /api/auth/me
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusUnauthorized)
		return
	}

	var user models.User
	err = h.db.QueryRow(
		`SELECT id, email, first_name, last_name, date_of_birth, COALESCE(avatar,''), COALESCE(nickname,''), COALESCE(about_me,''), is_public, created_at
		 FROM users WHERE id = ?`, userID,
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

	var followerCount, followingCount int
	h.db.QueryRow("SELECT COUNT(*) FROM followers WHERE followee_id = ? AND status = 'accepted'", userID).Scan(&followerCount)
	h.db.QueryRow("SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted'", userID).Scan(&followingCount)

	json.NewEncoder(w).Encode(map[string]interface{}{"user": user, "follower_count": followerCount, "following_count": followingCount})
}