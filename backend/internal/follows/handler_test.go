package follows

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

func TestHandlerFollowCreatesRelationshipForCurrentUser(t *testing.T) {
	repo := newFakeRepository()
	repo.users[2] = &User{ID: 2, IsPublic: true}

	handler := NewHandler(NewService(repo)).routes()

	response := request(t, handler, http.MethodPost, "/api/follows", `{"followingId":2}`, 1)

	if response.Code != http.StatusCreated {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusCreated)
	}

	var relationship Relationship
	if err := json.NewDecoder(response.Body).Decode(&relationship); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if relationship.FollowerID != 1 || relationship.FollowingID != 2 {
		t.Fatalf("got relationship %#v, want follower 1 following 2", relationship)
	}
}

func TestHandlerAcceptRequestRequiresTargetUser(t *testing.T) {
	repo := newFakeRepository()
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowPending,
	}

	handler := NewHandler(NewService(repo)).routes()

	response := request(t, handler, http.MethodPost, "/api/follows/requests/1/accept", "", 3)

	if response.Code != http.StatusForbidden {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusForbidden)
	}
}

func TestHandlerUnfollowDeletesRelationship(t *testing.T) {
	repo := newFakeRepository()
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowAccepted,
	}

	handler := NewHandler(NewService(repo)).routes()

	response := request(t, handler, http.MethodDelete, "/api/follows?followingId=2", "", 1)

	if response.Code != http.StatusNoContent {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusNoContent)
	}

	if _, ok := repo.relationships[1]; ok {
		t.Fatal("expected relationship to be deleted")
	}
}

func (h *Handler) routes() http.Handler {
	mux := http.NewServeMux()
	h.Register(mux)
	return mux
}

func request(t *testing.T, handler http.Handler, method, target, body string, userID int) *httptest.ResponseRecorder {
	t.Helper()

	req, err := http.NewRequest(method, target, bytes.NewBufferString(body))
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

	req.Header.Set(userIDHeader, strconv.Itoa(userID))
	req.Header.Set("Content-Type", "application/json")

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, req)
	return response
}
