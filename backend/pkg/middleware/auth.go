package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

const sessionCookieName = "session_id"

type contextKey string

const sessionContextKey contextKey = "session_id"

func JsonMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next(w, r)
	}
}

func SessionMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookieName)

		if err == http.ErrNoCookie {
			sessionID := uuid.NewString()
			http.SetCookie(w, &http.Cookie{
				Name:     sessionCookieName,
				Value:    sessionID,
				HttpOnly: true,
				Path:     "/",
				SameSite: http.SameSiteLaxMode,
			})
			ctx := context.WithValue(
				r.Context(),
				sessionContextKey,
				sessionID,
			)
			next(w, r.WithContext(ctx))
			return
		}

		if err != nil {
			http.Error(
				w, "failed to read session",
				http.StatusInternalServerError,
			)
			return
		}

		ctx := context.WithValue(
			r.Context(),
			sessionContextKey,
			cookie.Value,
		)
		next(w, r.WithContext(ctx))
	}
}
