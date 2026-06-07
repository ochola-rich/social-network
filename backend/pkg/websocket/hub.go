package websocket

import (
	"fmt"
	"sync"
)

type MessageType string

const (
	TypePrivateMessage   MessageType = "private_message"
	TypeGroupMessage     MessageType = "group_message"
	TypeNotification     MessageType = "notification"
	TypeFollowRequest    MessageType = "follow_request"
	TypeGroupInvite      MessageType = "group_invite"
	TypeGroupJoinRequest MessageType = "group_join_request"
	TypeEventCreated     MessageType = "event_created"
	TypeError            MessageType = "error"
)

type Message struct {
	Type       MessageType `json:"type"`
	SenderID   int         `json:"sender_id,omitempty"`
	ReceiverID int         `json:"receiver_id,omitempty"`
	GroupID    int         `json:"group_id,omitempty"`
	Body       string      `json:"body,omitempty"`
	Payload    interface{} `json:"payload,omitempty"`
}

type Hub struct {
	mu sync.RWMutex

	clients map[*Client]bool

	rooms map[string]map[*Client]bool

	broadcast chan *envelope

	register   chan *Client
	unregister chan *Client
}

type envelope struct {
	msg    *Message
	roomID string
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		broadcast:  make(chan *envelope, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			// Auto-subscribe to the client's personal room
			h.joinRoom(client, client.userRoom())
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				h.leaveAllRooms(client)
				close(client.send)
			}
			h.mu.Unlock()

		case env := <-h.broadcast:
			h.mu.RLock()
			h.dispatch(env)
			h.mu.RUnlock()
		}
	}
}

// Dispatch route an enlope to the correct recipient(s)

func (h *Hub) dispatch(env *envelope) {
	var targets map[*Client]bool

	if env.roomID != "" {
		targets = h.rooms[env.roomID]
	} else if env.msg.ReceiverID != 0 {
		targets = h.rooms[userRoom(env.msg.ReceiverID)]
	}

	for client := range targets {
		select {
		case client.send <- env.msg:
		default:
			// Slow client — drop and let unregister clean up
			go func(c *Client) { h.unregister <- c }(client)
		}
	}
}

// SendToUser delivers a message to a specific user's personal room.
func (h *Hub) SendToUser(userID int, msg *Message) {
	h.broadcast <- &envelope{msg: msg, roomID: userRoom(userID)}
}

// SendToGroup delivers a message to everyone in a group room.
func (h *Hub) SendToGroup(groupID int, msg *Message) {
	h.broadcast <- &envelope{msg: msg, roomID: groupRoom(groupID)}
}

// JoinGroupRoom subscribes a client to a group chat room.
func (h *Hub) JoinGroupRoom(client *Client, groupID int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.joinRoom(client, groupRoom(groupID))
}

// LeaveGroupRoom removes a client from a group chat room.
func (h *Hub) LeaveGroupRoom(client *Client, groupID int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.leaveRoom(client, groupRoom(groupID))
}

// --- Internal room helpers (must be called with mu held) ---

func (h *Hub) joinRoom(client *Client, room string) {
	if h.rooms[room] == nil {
		h.rooms[room] = make(map[*Client]bool)
	}
	h.rooms[room][client] = true
}

func (h *Hub) leaveRoom(client *Client, room string) {
	if members, ok := h.rooms[room]; ok {
		delete(members, client)
		if len(members) == 0 {
			delete(h.rooms, room)
		}
	}
}

func (h *Hub) leaveAllRooms(client *Client) {
	for room, members := range h.rooms {
		delete(members, client)
		if len(members) == 0 {
			delete(h.rooms, room)
		}
	}
}

// --- Room key helpers ---

func userRoom(userID int) string {
	return "user:" + itoa(userID)
}

func groupRoom(groupID int) string {
	return "group:" + itoa(groupID)
}

func itoa(n int) string {
	return fmt.Sprintf("%d", n)
}
