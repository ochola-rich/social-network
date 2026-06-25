# Editorial Pulse - Social Network Platform

Welcome to **Editorial Pulse**, a premium, full-stack social networking platform designed with an elegant bento layout aesthetic. The application is built with a high-performance **Go** backend and a responsive **Next.js** frontend.

---

## 🏗️ Architecture & Technologies

### Backend (Go)
- **Go 1.22**: High-performance, clean, and concurrency-focused API server.
- **SQLite3**: Lightweight and fast embedded database.
- **Gorilla WebSocket**: Enables real-time chat, notifications, and group events.
- **RESTful Architecture**: Structured handlers with middleware for authorization, CORS, and request processing.

### Frontend (Next.js)
- **Next.js 16 (App Router)**: Modern React framework utilizing server and client-side rendering.
- **TailwindCSS**: Modular, sleek styling adhering to the Editorial Pulse design system.
- **Zustand**: Lightweight global state management for auth session tracking.
- **Lucide React**: Premium icon set for consistent visual aesthetics.

---

## 📁 Project Directory Structure

```text
social-network/
├── docker-compose.yml           # Multi-container orchestration (Backend + Frontend)
├── go.work                      # Go multi-module workspace
├── backend/                     # Go Backend Application
│   ├── cmd/server/main.go       # Actual Server Entry Point (DB init, router, routes)
│   ├── server.go                # Skeletal Health check entry point
│   ├── Dockerfile               # Multi-stage production container
│   ├── go.mod / go.sum          # Go dependencies
│   ├── internal/                # Domain-specific backend business logic
│   │   └── follows/             # Follow/Unfollow & Pending requests service/handlers
│   ├── pkg/                     # Shared modules and infrastructure
│   │   ├── db/                  # SQLite migrations and driver
│   │   ├── handlers/            # REST API route handlers
│   │   ├── middleware/          # Authorization and CORS middleware
│   │   ├── models/              # Shared data transfer structures
│   │   ├── sessions/            # Session token store and authentication guards
│   │   └── websocket/           # WebSocket communication hub & clients
│   └── uploads/                 # Uploaded media store (e.g., images)
└── frontend/                    # Next.js Frontend Application
    ├── Dockerfile               # Development stage container
    ├── tailwind.config.ts       # Design tokens & aesthetic styling
    ├── package.json             # Node dependencies and scripts
    └── src/
        ├── app/                 # Next.js App Router (Explore, Settings, Chat, Feed)
        ├── components/          # Reusable UI cards and layouts
        ├── lib/                 # REST API & WebSocket clients
        ├── store/               # Zustand authentication store
        └── types/               # TypeScript interfaces
```

---

## 🛠️ Setup & Execution

### Option A: Using Docker Compose (Recommended)
This runs the complete stack (Go API + Next.js App + SQLite Database) in isolated containers:

1. Build and launch all services:
   ```bash
   docker-compose up --build
   ```
2. Access the applications:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8080](http://localhost:8080)
   - **Backend Health Check**: [http://localhost:8080/health](http://localhost:8080/health)

### Option B: Running Locally (Manual Setup)

#### 1. Start the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Download Go modules:
   ```bash
   go mod download
   ```
3. Run the Go server:
   ```bash
   go run cmd/server/main.go
   ```

#### 2. Start the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📋 Features & Capabilities

1. **Authentication & Identity**:
   - Secure registration and session-based login.
   - Profile customizability (Avatar, Bio, Privacy settings).
2. **Follow Lifecycle**:
   - Public/Private profiles.
   - Instant accepts for public users; pending request queue for private users.
3. **Explore / Discovery**:
   - Curated voices recommendation cards.
   - Bento-grid layout showing trending topics and categories.
4. **Bento Feed & Posts**:
   - Multi-format posts (text, image, quote layouts).
   - Comments, likes, and bookmarking.
5. **Real-time Chat**:
   - Private 1-to-1 conversations.
   - WebSocket client synchronization.
6. **Group Spaces**:
   - Create and join custom communities.
   - Schedule and vote on group events ("Going" vs. "Not Going").
7. **Instant Notifications**:
   - Alerts for follow requests, group invites, and event scheduling.

---

## 🔍 Database Schema Overview
The database uses **SQLite3** with migrations managed automatically on startup. The schema represents:
- `users`: Core profile details and credentials.
- `sessions`: Auth tokens tracking active logins.
- `followers`: Relationship states (`pending`, `accepted`, `declined`).
- `posts` / `comments` / `post_media`: Feed posts with nested comments and file uploads.
- `groups` / `group_members`: Communities and membership state logs.
- `group_events` / `event_responses`: Event planning, RSVPs, and tallies.
- `notifications`: User alert logs.
- `messages`: Chat message logs.

Detailed schema definitions can be found in [docs/erd.md](file:///home/student/riotieno/social-network/docs/erd.md).

---

## 🛠️ Project Review & Resolved "Hanging" Items

During our code review and auditing process, several issues were resolved:

1. **Go Version Mismatch (Fixed)**:
   - *Issue*: `backend/go.mod` originally targeted a future version `go 1.25.1` and required dependencies (`golang.org/x/crypto v0.53.0`) that forced the toolchain to download a missing version of Go, causing build failures on host systems.
   - *Solution*: Downgraded `golang.org/x/crypto` to `v0.21.0` (which is fully compatible with Go 1.22), and updated `backend/go.mod` and `go.work` to target **Go 1.22**. The backend now builds and runs tests successfully on standard Go installations.
   - *Verify*: `go test ./...` now compiles and passes successfully.

2. **Dockerfile Build Mismatch (Fixed)**:
   - *Issue*: `backend/Dockerfile` compiled `server.go` at the root, which contains only a basic health-check endpoint. The actual social network backend logic (`cmd/server/main.go`) was ignored.
   - *Solution*: Corrected the `Dockerfile` to build `cmd/server/main.go`. Running `docker-compose` now boots the complete REST and WebSocket application.

3. **Ignored Configuration Environment Variables (Fixed)**:
   - *Issue*: `backend/cmd/server/main.go` hardcoded the SQLite DB path (`./data/social_network.db`), upload directory, and server port, rendering the environment variables configured in `docker-compose.yml` (`DB_PATH`, `PORT`) completely ignored.
   - *Solution*: Modified `main.go` to dynamically read configuration values from environment variables (`DB_PATH`, `PORT`, `UPLOAD_DIR`) with safe, local fallbacks.

4. **Git Branch Audit (Completed)**:
   - *Active Development Branches*:
     - `origin/develop` (Merged!): Contained the newly developed settings layout, explore page, and core post card image handling. This branch has been successfully merged into `main` without conflicts.
     - `origin/follows` (Obsolete - Ignored): This old feature branch was determined to be obsolete since the `main` branch already possesses a much more advanced, fully integrated, and thoroughly tested implementation of the followers module.
