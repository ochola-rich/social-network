package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJsonMiddleware(t *testing.T) {
	handler := JsonMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)
	got := rec.Header().Get("COntent-Type")
	want := "application/json"

	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestSessionMiddlewareCreatesSession(t *testing.T) {
	var sessionID string

	handler := SessionMiddleware(func(w http.ResponseWriter, r *http.Request) {
		value := r.Context().Value(sessionContextKey)

		id, ok := value.(string)
		if !ok {
			t.Fatal("session id not found in context")
		}

		sessionID = id
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if sessionID == "" {
		t.Fatal("expected session id to be created")
	}

	cookies := rec.Result().Cookies()

	if len(cookies) == 0 {
		t.Fatal("expected session cookie")
	}

	if cookies[0].Name != sessionCookieName {
		t.Errorf(
			"got cookie name %q, want %q",
			cookies[0].Name,
			sessionCookieName,
		)
	}
}
