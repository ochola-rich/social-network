package websocket

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// newTestHub creates a hub and starts its Run loop.
func newTestHub(t *testing.T) *Hub {
	t.Helper()
	hub := NewHub()
	go hub.Run()
	return hub
}

// newTestClient creates a bare Client wired to hub (no real WS conn).
// Use this for unit-testing hub internals without a network connection.
func newTestClient(hub *Hub, userID int, groupIDs []int) *Client {
	c := &Client{
		hub:      hub,
		send:     make(chan *Message, 64),
		UserID:   userID,
		GroupIDs: groupIDs,
	}
	return c
}

// registerAndWait registers a client and gives the hub's goroutine time to process it.
func registerAndWait(hub *Hub, c *Client) {
	hub.register <- c
	time.Sleep(10 * time.Millisecond)
}

// drain reads one message from a client's send channel with a short timeout.
// Returns nil if nothing arrives in time.
func drain(c *Client) *Message {
	select {
	case msg := <-c.send:
		return msg
	case <-time.After(100 * time.Millisecond):
		return nil
	}
}

// dialTestServer spins up an httptest server with a WS handler, dials it,
// and returns the *websocket.Conn for the test and the hub used.
func dialTestServer(t *testing.T, userID int, groupIDs []int) (*websocket.Conn, *Hub) {
	t.Helper()
	hub := newTestHub(t)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWS(hub, w, r, userID, groupIDs)
	}))
	t.Cleanup(srv.Close)

	url := "ws" + strings.TrimPrefix(srv.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { conn.Close() })

	// Give the hub time to register the client
	time.Sleep(20 * time.Millisecond)
	return conn, hub
}

// ─────────────────────────────────────────────
// Hub unit tests (no network)
// ─────────────────────────────────────────────

func TestNewHub(t *testing.T) {
	hub := NewHub()
	if hub.clients == nil {
		t.Error("clients map is nil")
	}
	if hub.rooms == nil {
		t.Error("rooms map is nil")
	}
}

func TestHub_RegisterClient(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 1, nil)

	registerAndWait(hub, c)

	hub.mu.RLock()
	defer hub.mu.RUnlock()

	if !hub.clients[c] {
		t.Error("client not found in hub.clients after registration")
	}
	if hub.rooms[userRoom(1)] == nil || !hub.rooms[userRoom(1)][c] {
		t.Error("client not auto-subscribed to personal room on registration")
	}
}

func TestHub_UnregisterClient(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 2, nil)

	registerAndWait(hub, c)
	hub.unregister <- c
	time.Sleep(20 * time.Millisecond)

	hub.mu.RLock()
	defer hub.mu.RUnlock()

	if hub.clients[c] {
		t.Error("client still present in hub.clients after unregister")
	}
}

func TestHub_UnregisterClosesSendChannel(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 3, nil)

	registerAndWait(hub, c)
	hub.unregister <- c
	time.Sleep(20 * time.Millisecond)

	// Reading from a closed channel should return the zero value immediately.
	select {
	case _, open := <-c.send:
		if open {
			t.Error("send channel still open after unregister")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("send channel was not closed after unregister")
	}
}

func TestHub_SendToUser_Delivered(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 10, nil)
	registerAndWait(hub, c)

	msg := &Message{Type: TypeNotification, Body: "hello"}
	hub.SendToUser(10, msg)

	got := drain(c)
	if got == nil {
		t.Fatal("expected message on send channel, got nothing")
	}
	if got.Body != "hello" {
		t.Errorf("body = %q; want %q", got.Body, "hello")
	}
}

func TestHub_SendToUser_WrongUser_NotDelivered(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 11, nil)
	registerAndWait(hub, c)

	hub.SendToUser(99, &Message{Type: TypeNotification, Body: "wrong"})

	if got := drain(c); got != nil {
		t.Errorf("client received a message not intended for it: %+v", got)
	}
}

func TestHub_SendToGroup_Delivered(t *testing.T) {
	hub := newTestHub(t)

	c1 := newTestClient(hub, 20, []int{5})
	c2 := newTestClient(hub, 21, []int{5})
	registerAndWait(hub, c1)
	registerAndWait(hub, c2)

	hub.mu.Lock()
	hub.joinRoom(c1, groupRoom(5))
	hub.joinRoom(c2, groupRoom(5))
	hub.mu.Unlock()

	msg := &Message{Type: TypeGroupMessage, GroupID: 5, Body: "group hello"}
	hub.SendToGroup(5, msg)

	for _, c := range []*Client{c1, c2} {
		got := drain(c)
		if got == nil {
			t.Errorf("client %d did not receive group message", c.UserID)
		}
	}
}

func TestHub_JoinGroupRoom(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 30, nil)
	registerAndWait(hub, c)

	hub.JoinGroupRoom(c, 7)

	hub.mu.RLock()
	defer hub.mu.RUnlock()

	if !hub.rooms[groupRoom(7)][c] {
		t.Error("client not found in group room after JoinGroupRoom")
	}
}

func TestHub_LeaveGroupRoom(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 31, nil)
	registerAndWait(hub, c)

	hub.JoinGroupRoom(c, 8)
	hub.LeaveGroupRoom(c, 8)
	time.Sleep(10 * time.Millisecond)

	hub.mu.RLock()
	defer hub.mu.RUnlock()

	if hub.rooms[groupRoom(8)] != nil && hub.rooms[groupRoom(8)][c] {
		t.Error("client still in group room after LeaveGroupRoom")
	}
}

func TestHub_EmptyRoomRemovedAfterLeave(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 32, nil)
	registerAndWait(hub, c)

	hub.JoinGroupRoom(c, 9)
	hub.LeaveGroupRoom(c, 9)
	time.Sleep(10 * time.Millisecond)

	hub.mu.RLock()
	defer hub.mu.RUnlock()

	if _, exists := hub.rooms[groupRoom(9)]; exists {
		t.Error("empty room was not cleaned up from hub.rooms")
	}
}

// ─────────────────────────────────────────────
// Client unit tests (no network)
// ─────────────────────────────────────────────

func TestClient_UserRoom(t *testing.T) {
	c := &Client{UserID: 42}
	if got := c.userRoom(); got != "user:42" {
		t.Errorf("userRoom() = %q; want %q", got, "user:42")
	}
}

func TestClient_IsMember_True(t *testing.T) {
	c := &Client{GroupIDs: []int{1, 2, 3}}
	if !c.isMember(2) {
		t.Error("isMember(2) returned false; want true")
	}
}

func TestClient_IsMember_False(t *testing.T) {
	c := &Client{GroupIDs: []int{1, 2, 3}}
	if c.isMember(99) {
		t.Error("isMember(99) returned true; want false")
	}
}

func TestClient_IsMember_Empty(t *testing.T) {
	c := &Client{}
	if c.isMember(1) {
		t.Error("isMember on empty GroupIDs returned true; want false")
	}
}

func TestClient_ParseMessage_Valid(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 5, nil)

	raw, _ := json.Marshal(Message{
		Type:       TypePrivateMessage,
		ReceiverID: 9,
		Body:       "hi",
	})
	msg, err := c.parseMessage(raw)
	if err != nil {
		t.Fatalf("parseMessage error: %v", err)
	}
	if msg.SenderID != 5 {
		t.Errorf("SenderID = %d; want 5 (server should stamp it)", msg.SenderID)
	}
	if msg.ReceiverID != 9 {
		t.Errorf("ReceiverID = %d; want 9", msg.ReceiverID)
	}
}

func TestClient_ParseMessage_Invalid(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 5, nil)

	_, err := c.parseMessage([]byte("not json"))
	if err == nil {
		t.Error("expected error parsing invalid JSON, got nil")
	}
}

func TestClient_SendError(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 6, nil)

	c.sendError("something went wrong")

	got := drain(c)
	if got == nil {
		t.Fatal("expected error message on send channel")
	}
	if got.Type != TypeError {
		t.Errorf("type = %q; want %q", got.Type, TypeError)
	}
	if got.Body != "something went wrong" {
		t.Errorf("body = %q; want %q", got.Body, "something went wrong")
	}
}

func TestClient_RouteOutbound_PrivateMessage(t *testing.T) {
	hub := newTestHub(t)

	sender := newTestClient(hub, 1, nil)
	receiver := newTestClient(hub, 2, nil)
	registerAndWait(hub, sender)
	registerAndWait(hub, receiver)

	msg := &Message{Type: TypePrivateMessage, ReceiverID: 2, Body: "hey"}
	sender.routeOutbound(msg)

	got := drain(receiver)
	if got == nil {
		t.Fatal("receiver did not get the private message")
	}
	if got.Body != "hey" {
		t.Errorf("body = %q; want %q", got.Body, "hey")
	}
}

func TestClient_RouteOutbound_PrivateMessage_MissingReceiver(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 1, nil)
	registerAndWait(hub, c)

	c.routeOutbound(&Message{Type: TypePrivateMessage}) // ReceiverID = 0

	got := drain(c)
	if got == nil || got.Type != TypeError {
		t.Errorf("expected error message for missing receiver_id, got: %+v", got)
	}
}

func TestClient_RouteOutbound_GroupMessage_Member(t *testing.T) {
	hub := newTestHub(t)

	sender := newTestClient(hub, 1, []int{10})
	receiver := newTestClient(hub, 2, []int{10})
	registerAndWait(hub, sender)
	registerAndWait(hub, receiver)

	hub.JoinGroupRoom(sender, 10)
	hub.JoinGroupRoom(receiver, 10)

	sender.routeOutbound(&Message{Type: TypeGroupMessage, GroupID: 10, Body: "group msg"})

	got := drain(receiver)
	if got == nil {
		t.Fatal("receiver did not get the group message")
	}
	if got.Body != "group msg" {
		t.Errorf("body = %q; want %q", got.Body, "group msg")
	}
}

func TestClient_RouteOutbound_GroupMessage_NonMember(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 1, []int{}) // not in group 10
	registerAndWait(hub, c)

	c.routeOutbound(&Message{Type: TypeGroupMessage, GroupID: 10, Body: "sneak"})

	got := drain(c)
	if got == nil || got.Type != TypeError {
		t.Errorf("expected error for non-member group message, got: %+v", got)
	}
}

func TestClient_RouteOutbound_GroupMessage_MissingGroupID(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 1, []int{5})
	registerAndWait(hub, c)

	c.routeOutbound(&Message{Type: TypeGroupMessage}) // GroupID = 0

	got := drain(c)
	if got == nil || got.Type != TypeError {
		t.Errorf("expected error for missing group_id, got: %+v", got)
	}
}

func TestClient_RouteOutbound_UnknownType(t *testing.T) {
	hub := newTestHub(t)
	c := newTestClient(hub, 1, nil)
	registerAndWait(hub, c)

	c.routeOutbound(&Message{Type: "mystery_type"})

	got := drain(c)
	if got == nil || got.Type != TypeError {
		t.Errorf("expected error for unknown message type, got: %+v", got)
	}
}

// ─────────────────────────────────────────────
// Integration tests (real WS connections)
// ─────────────────────────────────────────────

func TestIntegration_SendAndReceivePrivateMessage(t *testing.T) {
	hub := newTestHub(t)

	// Spin up a server that accepts connections for two different users
	var (
		connA *websocket.Conn
		connB *websocket.Conn
	)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid := 0
		if r.URL.Query().Get("user") == "A" {
			uid = 100
		} else {
			uid = 101
		}
		ServeWS(hub, w, r, uid, nil)
	}))
	t.Cleanup(srv.Close)

	base := "ws" + strings.TrimPrefix(srv.URL, "http")

	var err error
	connA, _, err = websocket.DefaultDialer.Dial(base+"?user=A", nil)
	if err != nil {
		t.Fatalf("dial A: %v", err)
	}
	t.Cleanup(func() { connA.Close() })

	connB, _, err = websocket.DefaultDialer.Dial(base+"?user=B", nil)
	if err != nil {
		t.Fatalf("dial B: %v", err)
	}
	t.Cleanup(func() { connB.Close() })

	// Give hub time to register both clients
	time.Sleep(30 * time.Millisecond)

	// A sends a private message to B (userID 101)
	out := Message{Type: TypePrivateMessage, ReceiverID: 101, Body: "integration test"}
	if err := connA.WriteJSON(out); err != nil {
		t.Fatalf("write: %v", err)
	}

	connB.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	var got Message
	if err := connB.ReadJSON(&got); err != nil {
		t.Fatalf("B did not receive message: %v", err)
	}
	if got.Body != "integration test" {
		t.Errorf("body = %q; want %q", got.Body, "integration test")
	}
	if got.SenderID != 100 {
		t.Errorf("SenderID = %d; want 100", got.SenderID)
	}
}

func TestIntegration_NotificationPushedByServer(t *testing.T) {
	conn, hub := dialTestServer(t, 200, nil)

	hub.SendToUser(200, &Message{
		Type: TypeNotification,
		Body: "you have a follow request",
	})

	conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	var got Message
	if err := conn.ReadJSON(&got); err != nil {
		t.Fatalf("did not receive notification: %v", err)
	}
	if got.Type != TypeNotification {
		t.Errorf("type = %q; want %q", got.Type, TypeNotification)
	}
}

// ─────────────────────────────────────────────
// Helper / utility tests
// ─────────────────────────────────────────────

func TestRoomKeyHelpers(t *testing.T) {
	tests := []struct {
		name string
		got  string
		want string
	}{
		{"userRoom 1", userRoom(1), "user:1"},
		{"userRoom 42", userRoom(42), "user:42"},
		{"groupRoom 1", groupRoom(1), "group:1"},
		{"groupRoom 99", groupRoom(99), "group:99"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.want {
				t.Errorf("got %q; want %q", tt.got, tt.want)
			}
		})
	}
}

func TestMessageTypes(t *testing.T) {
	types := []MessageType{
		TypePrivateMessage,
		TypeGroupMessage,
		TypeNotification,
		TypeFollowRequest,
		TypeGroupInvite,
		TypeGroupJoinRequest,
		TypeEventCreated,
		TypeError,
	}
	seen := map[MessageType]bool{}
	for _, mt := range types {
		if mt == "" {
			t.Errorf("empty MessageType constant found")
		}
		if seen[mt] {
			t.Errorf("duplicate MessageType: %q", mt)
		}
		seen[mt] = true
	}
}
