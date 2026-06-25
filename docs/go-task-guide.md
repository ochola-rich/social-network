# Go Implementation Guide For Assigned Tasks

You are strongest in Go, so do the backend first and let the frontend consume clean APIs later.

## Recommended Order

1. Build the SQLite foundation.
2. Implement Issue #7: follow lifecycle.
3. Implement Issue #12: notifications.
4. Implement Issue #15: group events.
5. Add frontend only after backend endpoints are working and tested.

This order matters because notifications and group events need users, sessions, groups, and follow/group workflows to exist.

## Step 1: SQLite Foundation

Create this backend structure:

```text
backend/
  internal/
    db/
      sqlite.go
      migrations/
        sqlite/
          000001_create_users_table.up.sql
          000001_create_users_table.down.sql
          000002_create_follows_table.up.sql
          000002_create_follows_table.down.sql
          000003_create_groups_table.up.sql
          000003_create_groups_table.down.sql
          000004_create_notifications_table.up.sql
          000004_create_notifications_table.down.sql
          000005_create_group_events_table.up.sql
          000005_create_group_events_table.down.sql
```

Use `docs/erd.md` as the table source. Start with only the tables needed for assigned tasks:

- `users`
- `sessions`
- `user_follows`
- `groups`
- `group_memberships`
- `notifications`
- `group_events`
- `event_responses`

## Step 2: Issue #7 Follow Lifecycle

Create:

```text
backend/internal/follows/
  handler.go
  service.go
  repository.go
  models.go
  service_test.go
```

Core model:

```go
type FollowStatus string

const (
    FollowPending  FollowStatus = "pending"
    FollowAccepted FollowStatus = "accepted"
    FollowDeclined FollowStatus = "declined"
)

type Relationship struct {
    ID          int
    FollowerID  int
    FollowingID int
    Status      FollowStatus
}
```

Endpoints:

```text
GET    /api/users/{userID}/relationship
POST   /api/users/{userID}/follow
DELETE /api/users/{userID}/follow
POST   /api/follow-requests/{requestID}/accept
POST   /api/follow-requests/{requestID}/decline
```

Business rules:

- Users cannot follow themselves.
- If target profile is public, create `accepted` relationship immediately.
- If target profile is private, create `pending` relationship.
- Duplicate follow requests should return a clear conflict response.
- Unfollow deletes the accepted or pending relationship.
- Accept changes `pending` to `accepted`.
- Decline changes `pending` to `declined` or deletes it. Pick one behavior and keep it consistent.

Tests to write:

- Public profile follow becomes `accepted`.
- Private profile follow becomes `pending`.
- Duplicate follow returns conflict.
- Unfollow removes the relationship.
- Only the target user can accept or decline the request.

## Step 3: Issue #12 Notifications

Create:

```text
backend/internal/notifications/
  handler.go
  service.go
  repository.go
  models.go
  service_test.go
```

Core model:

```go
type Notification struct {
    ID          int
    RecipientID int
    ActorID     *int
    Type        string
    EntityType  string
    EntityID    int
    Body        string
    ReadAt      *time.Time
    CreatedAt   time.Time
}
```

Endpoints:

```text
GET  /api/notifications
GET  /api/notifications/unread-count
POST /api/notifications/{notificationID}/read
POST /api/notifications/read-all
```

Trigger notifications from:

- Private follow request.
- Group invitation.
- Group join request.
- Group event created.

WebSocket integration:

Use the existing `backend/pkg/websocket.Hub`.

When creating a notification:

1. Insert notification into SQLite.
2. Send a `TypeNotification` packet to the recipient with `hub.SendToUser(recipientID, msg)`.

Tests to write:

- Notification is created unread.
- Unread count changes after marking read.
- Marking read twice is safe.
- Service calls WebSocket broadcaster when a notification is created.

## Step 4: Issue #15 Group Events

Create under the requested path:

```text
backend/internal/groups/
  events_handler.go
  events_service.go
  events_repository.go
  events_models.go
  events_service_test.go
```

Core models:

```go
type GroupEvent struct {
    ID          int
    GroupID     int
    CreatorID   int
    Title       string
    Description string
    EventAt     time.Time
}

type EventResponse string

const (
    EventGoing    EventResponse = "going"
    EventNotGoing EventResponse = "not_going"
)
```

Endpoints:

```text
GET  /api/groups/{groupID}/events
POST /api/groups/{groupID}/events
POST /api/groups/{groupID}/events/{eventID}/responses
```

Vote request body:

```json
{
  "response": "going"
}
```

Business rules:

- Only accepted group members can list events.
- Only accepted group members can create events.
- Event title, description, and date/time are required.
- Event date/time should be in the future.
- Each member can have only one response per event.
- A second vote should update the previous vote, not create a duplicate.

Tests to write:

- Member can create event.
- Non-member cannot create event.
- Member can list group events.
- Member can vote going.
- Member can change vote from going to not going.
- Vote tally returns accurate counts.

## Suggested Backend Wiring

Update `backend/server.go` gradually:

```go
func main() {
    database := db.MustOpen()
    hub := websocket.NewHub()
    go hub.Run()

    mux := http.NewServeMux()

    follows.RegisterRoutes(mux, followsService)
    notifications.RegisterRoutes(mux, notificationsService)
    groups.RegisterEventRoutes(mux, groupEventsService)

    http.ListenAndServe(":8080", mux)
}
```

Keep the HTTP handlers thin:

- Decode request.
- Get authenticated user ID.
- Call service.
- Encode JSON response.

Put rules in services, not handlers.

Put SQL in repositories, not services.

## What To Work On First

Start with Issue #7 because it unlocks profile relationships and notification triggers.

First coding target:

1. Add `users` and `user_follows` migrations.
2. Add `internal/follows` models and repository.
3. Add follow service rules.
4. Add service tests.
5. Add HTTP handlers.

Once Issue #7 works, Issue #12 becomes much easier because follow requests can trigger notifications.
