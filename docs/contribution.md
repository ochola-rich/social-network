## Project Structure format:

```text
social-network/
├── docker-compose.yml              # Orchestrates both containers
├── .gitignore
│
├── backend/                        # Go Backend Application
│   ├── Dockerfile                  # Multi-stage Go production file
│   ├── go.mod
│   ├── go.sum
│   ├── server.go                   # Primary entry point (attaches router/DB)
│   │
│   ├── pkg/                        # Decoupled internal packages
│   │   ├── db/                     # Database layer
│   │   │   ├── migrations/         # Mandatory SQL files 
│   │   │   │   └── sqlite/         # Folder path required for testing
│   │   │   └── sqlite/
│   │   │       └── sqlite.go       # DB pool setup & migration triggers
│   │   │
│   │   ├── middleware/             # Shared HTTP middleware functions
│   │   │   └── auth.go             # Session validation checks
│   │   │
│   │   └── websocket/              # Real-time WebSockets core
│   │       ├── hub.go              # Handles connected client state tracking
│   │       └── client.go           # Upgrader and individual connection logic
│   │
│   └── internal/                   # Domain-specific backend business logic
│       ├── auth/                   # Registration, login, session storage
│       ├── profile/                # User profile data feeds
│       ├── posts/                  # Posts & nested comment streams
│       ├── groups/                 # Club spaces, rules, and events
│       └── chat/                   # Message dispatch handlers & emoji rules
│
└── frontend/                       # Next.js Frontend Application
    ├── Dockerfile                  # Node/Next development container
    ├── package.json
    ├── next.config.js
    │
    ├── public/                     # Static elements & default UI assets
    │   └── assets/                 # Icons, fallback avatars, etc.
    │
    └── src/                        # Main application code
        ├── app/                    # Next.js App Router (Layouts & Pages)
        │   ├── layout.tsx          # Root platform design (Includes Notification Bell)
        │   ├── page.tsx            # Global Feed View
        │   ├── login/              # Portal page
        │   ├── register/           # Registration submission page
        │   ├── profile/            # Profile routing
        │   │   └── [userId]/       # Dynamic ID lookup path for user walls
        │   ├── messages/           # Main chat board panels
        │   └── groups/             # Explorer deck & separate sub-rooms
        │       ├── page.tsx        # Global search & discovery
        │       └── [groupId]/      # Dedicated group feed & internal event cards
        │
        ├── context/                # Global state wrappers
        │   └── AuthContext.tsx     # Keeps tracked session tokens accessible
        │
        ├── components/             # Reusable atomic UI elements
        │   ├── PostCard.tsx        # Individual post container with commenting
        │   ├── CommentSection.tsx  # Interactive text & attachment threads
        │   ├── ChatWindow.tsx      # Target text viewport with Emoji panel
        │   └── Notification.tsx    # Live dynamic alerting panel
        │
        └── utils/                  # UI utility handlers
            └── websocket.ts        # Direct client browser WebSocket bridge
```
