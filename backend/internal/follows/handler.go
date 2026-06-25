package follows

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

const userIDHeader = "X-User-ID"

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/follows", h.relationships)
	mux.HandleFunc("/api/follows/requests/", h.requests)
}

func (h *Handler) relationships(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.relationship(w, r)
	case http.MethodPost:
		h.follow(w, r)
	case http.MethodDelete:
		h.unfollow(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) relationship(w http.ResponseWriter, r *http.Request) {
	currentUserID, ok := currentUserID(w, r)
	if !ok {
		return
	}

	followingID, ok := queryInt(w, r, "followingId")
	if !ok {
		return
	}

	relationship, err := h.service.Relationship(r.Context(), currentUserID, followingID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, relationship)
}

func (h *Handler) follow(w http.ResponseWriter, r *http.Request) {
	currentUserID, ok := currentUserID(w, r)
	if !ok {
		return
	}

	var request struct {
		FollowingID int `json:"followingId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeProblem(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if request.FollowingID == 0 {
		writeProblem(w, http.StatusBadRequest, "followingId is required")
		return
	}

	relationship, err := h.service.Follow(r.Context(), currentUserID, request.FollowingID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, relationship)
}

func (h *Handler) unfollow(w http.ResponseWriter, r *http.Request) {
	currentUserID, ok := currentUserID(w, r)
	if !ok {
		return
	}

	followingID, ok := queryInt(w, r, "followingId")
	if !ok {
		return
	}

	if err := h.service.Unfollow(r.Context(), currentUserID, followingID); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) requests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	currentUserID, ok := currentUserID(w, r)
	if !ok {
		return
	}

	id, action, ok := requestAction(w, r.URL.Path)
	if !ok {
		return
	}

	var (
		relationship *Relationship
		err          error
	)

	switch action {
	case "accept":
		relationship, err = h.service.Accept(r.Context(), currentUserID, id)
	case "decline":
		relationship, err = h.service.Decline(r.Context(), currentUserID, id)
	default:
		writeProblem(w, http.StatusNotFound, "unknown request action")
		return
	}

	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, relationship)
}

func currentUserID(w http.ResponseWriter, r *http.Request) (int, bool) {
	raw := r.Header.Get(userIDHeader)
	if raw == "" {
		writeProblem(w, http.StatusUnauthorized, "missing user identity")
		return 0, false
	}

	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		writeProblem(w, http.StatusUnauthorized, "invalid user identity")
		return 0, false
	}

	return id, true
}

func queryInt(w http.ResponseWriter, r *http.Request, key string) (int, bool) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		writeProblem(w, http.StatusBadRequest, key+" is required")
		return 0, false
	}

	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		writeProblem(w, http.StatusBadRequest, key+" must be a positive integer")
		return 0, false
	}

	return id, true
}

func requestAction(w http.ResponseWriter, path string) (int, string, bool) {
	parts := strings.Split(strings.TrimPrefix(path, "/api/follows/requests/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		writeProblem(w, http.StatusNotFound, "request action not found")
		return 0, "", false
	}

	id, err := strconv.Atoi(parts[0])
	if err != nil || id <= 0 {
		writeProblem(w, http.StatusBadRequest, "request id must be a positive integer")
		return 0, "", false
	}

	return id, parts[1], true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		writeProblem(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrForbidden):
		writeProblem(w, http.StatusForbidden, err.Error())
	case errors.Is(err, ErrCannotFollowSelf),
		errors.Is(err, ErrRelationshipExists),
		errors.Is(err, ErrRequestNotPending):
		writeProblem(w, http.StatusConflict, err.Error())
	default:
		writeProblem(w, http.StatusInternalServerError, "internal server error")
	}
}

func writeProblem(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
