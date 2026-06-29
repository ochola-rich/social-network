package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/handlers"
	"social-network/backend/pkg/sessions"
	"social-network/backend/pkg/websocket"
)

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/social_network.db"
	}
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = ":8080"
	} else if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	// Initialize Database
	db, err := sqlite.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize Session Store
	sessionStore := sessions.NewStore(db.DB)

	// Initialize WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize Handlers
	notificationsHandler := handlers.NewNotificationsHandler(db.DB)
	authHandler := handlers.NewAuthHandler(db.DB, sessionStore)
	postHandler := handlers.NewPostHandler(db.DB)
	followHandler := handlers.NewFollowHandler(db.DB, notificationsHandler)
	groupsHandler := handlers.NewGroupsHandler(db.DB, notificationsHandler)
	profileHandler := handlers.NewProfileHandler(db.DB)
	uploadHandler := handlers.NewUploadHandler(uploadDir)
	messagesHandler := handlers.NewMessagesHandler(db.DB, hub)

	// Router
	mux := http.NewServeMux()

	// Auth Routes
	mux.HandleFunc("/api/auth/register", authHandler.Register)
	mux.HandleFunc("/api/auth/login", authHandler.Login)
	mux.HandleFunc("/api/auth/logout", authHandler.Logout)
	mux.HandleFunc("/api/auth/me", sessionStore.RequireAuth(authHandler.Me))

	// Post Routes
	mux.HandleFunc("/api/posts", sessionStore.RequireAuth(postHandler.CreatePost))
	mux.HandleFunc("/api/posts/feed", sessionStore.RequireAuth(postHandler.GetFeed))
	mux.HandleFunc("/api/posts/", sessionStore.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/posts/" {
			http.NotFound(w, r)
			return
		}
		// Handle /api/posts/{id} and /api/posts/{id}/comment
		if filepath.Base(r.URL.Path) == "comment" {
			postHandler.AddComment(w, r)
		} else {
			postHandler.GetPost(w, r)
		}
	}))

	// User Search
	mux.HandleFunc("/api/users/search", sessionStore.RequireAuth(postHandler.SearchUsers))

	// Follow Routes
	mux.HandleFunc("/api/follow/request/", sessionStore.RequireAuth(followHandler.SendFollowRequest))
	mux.HandleFunc("/api/follow/accept/", sessionStore.RequireAuth(followHandler.AcceptFollowRequest))
	mux.HandleFunc("/api/follow/decline/", sessionStore.RequireAuth(followHandler.DeclineFollowRequest))
	mux.HandleFunc("/api/follow/unfollow/", sessionStore.RequireAuth(followHandler.Unfollow))
	mux.HandleFunc("/api/follow/pending", sessionStore.RequireAuth(followHandler.GetPendingFollowRequests))
	mux.HandleFunc("/api/follow/followers", sessionStore.RequireAuth(followHandler.GetFollowers))
	mux.HandleFunc("/api/follow/following", sessionStore.RequireAuth(followHandler.GetFollowing))

	// Group Routes
	mux.HandleFunc("/api/groups", sessionStore.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			groupsHandler.CreateGroup(w, r)
		} else {
			groupsHandler.GetAllGroups(w, r)
		}
	}))
	mux.HandleFunc("/api/groups/", sessionStore.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		// This is a bit complex due to multiple sub-routes
		// Handled in a simple way for now
		path := r.URL.Path
		if filepath.Base(path) == "join" {
			groupsHandler.JoinGroup(w, r)
		} else if filepath.Base(path) == "invite" {
			groupsHandler.InviteToGroup(w, r)
		} else if filepath.Base(path) == "posts" {
			groupsHandler.CreateGroupPost(w, r)
		} else if filepath.Base(path) == "events" {
			groupsHandler.CreateGroupEvent(w, r)
		} else if contains(path, "/accept/") {
			groupsHandler.AcceptGroupMember(w, r)
		} else if contains(path, "/decline/") {
			groupsHandler.DeclineGroupMember(w, r)
		} else {
			groupsHandler.GetGroup(w, r)
		}
	}))
	mux.HandleFunc("/api/events/", sessionStore.RequireAuth(groupsHandler.RespondToEvent))
	mux.HandleFunc("/api/groups/posts/", sessionStore.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodGet {
        // Fetch comments for a specific group post
        groupsHandler.GetGroupPostComments(w, r)
    } else if r.Method == http.MethodPost {
        // Add a new comment to a group post
        groupsHandler.AddGroupPostComment(w, r)
    } else {
        http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
    }
}))
	// Notification Routes
	mux.HandleFunc("/api/notifications", sessionStore.RequireAuth(notificationsHandler.GetNotifications))
	mux.HandleFunc("/api/notifications/read/", sessionStore.RequireAuth(notificationsHandler.MarkAsRead))
	mux.HandleFunc("/api/notifications/read-all", sessionStore.RequireAuth(notificationsHandler.MarkAllAsRead))

	// Profile Routes
	mux.HandleFunc("/api/profile/", sessionStore.RequireAuth(profileHandler.GetProfile))
	mux.HandleFunc("/api/profile", sessionStore.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			profileHandler.UpdateProfile(w, r)
		} else {
			http.NotFound(w, r)
		}
	}))
	mux.HandleFunc("/api/profile/privacy", sessionStore.RequireAuth(profileHandler.TogglePrivacy))

	// Upload Route
	mux.HandleFunc("/api/upload", sessionStore.RequireAuth(uploadHandler.Upload))

	// Message Routes
	mux.HandleFunc("/api/messages", sessionStore.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			messagesHandler.SendMessage(w, r)
		} else if r.Method == http.MethodGet {
			messagesHandler.GetConversations(w, r)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/messages/", sessionStore.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasPrefix(path, "/api/messages/group/") {
			messagesHandler.GetGroupMessages(w, r)
		} else {
			messagesHandler.GetConversation(w, r)
		}
	}))

	// WebSocket Route
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		userID, err := sessionStore.Authenticate(r)
		if err != nil || userID == 0 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get user's groups
		// We need a helper for this or just query here
		groupIDs := []int{}
		rows, err := db.Query("SELECT group_id FROM group_members WHERE user_id = ? AND status = 'accepted'", userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var gid int
				rows.Scan(&gid)
				groupIDs = append(groupIDs, gid)
			}
		}

		websocket.ServeWS(hub, w, r, userID, groupIDs)
	})

	// Serve Static Files
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))

	// CORS Middleware (very permissive for development)
	handler := corsMiddleware(mux)

	log.Printf("Server starting on http://localhost%s", port)
	if err := http.ListenAndServe(port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

// Simple CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000") // Adjust for frontend
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User-ID")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
