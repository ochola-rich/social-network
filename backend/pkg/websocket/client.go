package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from the peer (bytes).
	maxMessageSize = 4096
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins — tighten this in production
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Client represents a single WebSocket connection.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan *Message

	// Identity — set from the authenticated session before upgrading
	UserID int
	// Groups this client is a member of (joined on connect)
	GroupIDs []int
}

// userRoom returns this client's personal room key.
func (c *Client) userRoom() string {
	return userRoom(c.UserID)
}

// ServeWS upgrades an HTTP request to a WebSocket connection and wires the
// client into the hub. Call this from your HTTP handler after authenticating
// the user and resolving their group memberships.
//
//	func wsHandler(hub *Hub, w http.ResponseWriter, r *http.Request) {
//	    userID  := sessionUserID(r)
//	    groupIDs := db.GetUserGroupIDs(userID)
//	    websocket.ServeWS(hub, w, r, userID, groupIDs)
//	}
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID int, groupIDs []int) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan *Message, 256),
		UserID:   userID,
		GroupIDs: groupIDs,
	}

	hub.register <- client

	// Subscribe to all group rooms the user belongs to
	for _, gid := range groupIDs {
		hub.JoinGroupRoom(client, gid)
	}

	// Start pumps in separate goroutines
	go client.writePump()
	go client.readPump()
}

// readPump reads inbound messages from the WebSocket connection and routes them
// through the hub. One goroutine per client.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
			) {
				log.Printf("ws read error (user %d): %v", c.UserID, err)
			}
			break
		}

		msg, err := c.parseMessage(raw)
		if err != nil {
			c.sendError(fmt.Sprintf("invalid message: %v", err))
			continue
		}

		c.routeOutbound(msg)
	}
}

// writePump writes outbound messages from the send channel to the WebSocket
// connection. One goroutine per client.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(msg); err != nil {
				log.Printf("ws write error (user %d): %v", c.UserID, err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// parseMessage decodes raw bytes into a Message and stamps the sender.
func (c *Client) parseMessage(raw []byte) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(raw, &msg); err != nil {
		return nil, err
	}
	msg.SenderID = c.UserID // always trust server-side identity
	return &msg, nil
}

// routeOutbound decides where an outbound message from this client should go.
func (c *Client) routeOutbound(msg *Message) {
	switch msg.Type {
	case TypePrivateMessage:
		if msg.ReceiverID == 0 {
			c.sendError("private_message requires receiver_id")
			return
		}
		// Deliver to the recipient's personal room
		c.hub.SendToUser(msg.ReceiverID, msg)

	case TypeGroupMessage:
		if msg.GroupID == 0 {
			c.sendError("group_message requires group_id")
			return
		}
		// Verify membership (basic check — enforce properly in DB layer too)
		if !c.isMember(msg.GroupID) {
			c.sendError("not a member of that group")
			return
		}
		c.hub.SendToGroup(msg.GroupID, msg)

	default:
		c.sendError(fmt.Sprintf("unsupported message type: %s", msg.Type))
	}
}

// sendError pushes an error message back to this client only.
func (c *Client) sendError(reason string) {
	select {
	case c.send <- &Message{Type: TypeError, Body: reason}:
	default:
	}
}

// isMember checks whether the client belongs to a given group.
func (c *Client) isMember(groupID int) bool {
	for _, gid := range c.GroupIDs {
		if gid == groupID {
			return true
		}
	}
	return false
}
