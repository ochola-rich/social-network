package sessions

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
)

const sessionCookieName = "session_id"

// Store manages sessions in the database.
type Store struct {
	db *sql.DB
}

// NewStore creates a new session store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create creates a new session for a user and sets the cookie.
func (s *Store) Create(w http.ResponseWriter, userID int) (string, error) {
	token := uuid.NewString()
	expiresAt := time.Now().Add(24 * time.Hour)

	if _, err := s.db.Exec(
		"INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
		userID, token, expiresAt,
	); err != nil {
		return "", err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Expires:  expiresAt,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	return token, nil
}

// GetUserID retrieves the user ID from the session token in the request.
func (s *Store) GetUserID(r *http.Request) (int, error) {
	token, err := getTokenFromRequest(r)
	if err != nil {
		return 0, err
	}

	var userID int
	var expiresAt time.Time
	err = s.db.QueryRow(
		"SELECT user_id, expires_at FROM sessions WHERE token = ?",
		token,
	).Scan(&userID, &expiresAt)

	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}

	if time.Now().After(expiresAt) {
		s.db.Exec("DELETE FROM sessions WHERE token = ?", token)
		return 0, nil
	}

	return userID, nil
}

// Delete removes the session (logout).
func (s *Store) Delete(w http.ResponseWriter, r *http.Request) error {
	token, err := getTokenFromRequest(r)
	if err != nil {
		return err
	}

	if _, err := s.db.Exec("DELETE FROM sessions WHERE token = ?", token); err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	return nil
}

// Authenticate checks if the request has a valid session and returns the user ID.
func (s *Store) Authenticate(r *http.Request) (int, error) {
	userID, err := s.GetUserID(r)
	if err != nil {
		return 0, err
	}
	if userID == 0 {
		return 0, nil
	}
	return userID, nil
}

// RequireAuth is a middleware that requires authentication.
func (s *Store) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := s.Authenticate(r)
		if err != nil || userID == 0 {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		r.Header.Set("X-User-ID", strconv.Itoa(userID))
		next(w, r)
	}
}

// GetUserIDFromRequest extracts the authenticated user ID from the request header.
func GetUserIDFromRequest(r *http.Request) int {
	idStr := r.Header.Get("X-User-ID")
	id, _ := strconv.Atoi(idStr)
	return id
}

func getTokenFromRequest(r *http.Request) (string, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}