package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"social-network/backend/pkg/sessions"
)

// UploadHandler handles file uploads.
type UploadHandler struct {
	uploadDir string
}

// NewUploadHandler creates a new UploadHandler.
func NewUploadHandler(uploadDir string) *UploadHandler {
	os.MkdirAll(uploadDir, 0o755)
	return &UploadHandler{uploadDir: uploadDir}
}

// Upload handles image upload.
// POST /api/upload
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := sessions.GetUserIDFromRequest(r)
	if userID == 0 {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Limit upload size to 20MB
	r.Body = http.MaxBytesReader(w, r.Body, 20<<20)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, `{"error":"file too large or invalid form"}`, http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"no file provided"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true}
	if !allowedExts[ext] {
		http.Error(w, `{"error":"only JPEG, PNG and GIF files are allowed"}`, http.StatusBadRequest)
		return
	}

	// Create unique filename
	filename := fmt.Sprintf("%d_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(h.uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, `{"error":"failed to save file"}`, http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath)
		http.Error(w, `{"error":"failed to save file"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "file uploaded successfully",
		"filename": filename,
		"path":     "/uploads/" + filename,
	})
}