package models

import "time"

// User represents a user in the social network.
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	DateOfBirth  string    `json:"date_of_birth"`
	Avatar       string    `json:"avatar,omitempty"`
	Nickname     string    `json:"nickname,omitempty"`
	AboutMe      string    `json:"about_me,omitempty"`
	IsPublic     bool      `json:"is_public"`
	CreatedAt    time.Time `json:"created_at"`
}

// RegisterRequest represents the registration form data.
type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	Avatar      string `json:"avatar,omitempty"`
	Nickname    string `json:"nickname,omitempty"`
	AboutMe     string `json:"about_me,omitempty"`
}

// LoginRequest represents the login form data.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Session represents a user session.
type Session struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// Post represents a user post.
type Post struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Image     string    `json:"image,omitempty"`
	Privacy   string    `json:"privacy"` // public, almost_private, private
	CreatedAt time.Time `json:"created_at"`
	// Joined fields
	User      *User   `json:"user,omitempty"`
	UserIDs   []int   `json:"user_ids,omitempty"` // for private posts
	CommentCount int   `json:"comment_count,omitempty"`
}

// Comment represents a comment on a post.
type Comment struct {
	ID        int       `json:"id"`
	PostID    int       `json:"post_id"`
	UserID    int       `json:"user_id"`
	Content   string    `json:"content"`
	Image     string    `json:"image,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	User      *User     `json:"user,omitempty"`
}

// FollowRequest represents a follow relationship.
type FollowRequest struct {
	ID         int       `json:"id"`
	FollowerID int       `json:"follower_id"`
	FolloweeID int       `json:"followee_id"`
	Status     string    `json:"status"` // pending, accepted, declined
	CreatedAt  time.Time `json:"created_at"`
	Follower   *User     `json:"follower,omitempty"`
	Followee   *User     `json:"followee,omitempty"`
}

// Group represents a group in the social network.
type Group struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatorID   int       `json:"creator_id"`
	CreatedAt   time.Time `json:"created_at"`
	Creator     *User     `json:"creator,omitempty"`
	MemberCount int       `json:"member_count,omitempty"`
	IsMember    bool      `json:"is_member,omitempty"`
}

// GroupMember represents a group membership.
type GroupMember struct {
	ID        int       `json:"id"`
	GroupID   int       `json:"group_id"`
	UserID    int       `json:"user_id"`
	Status    string    `json:"status"` // invited, accepted, declined, requested
	CreatedAt time.Time `json:"created_at"`
	User      *User     `json:"user,omitempty"`
}

// GroupPost represents a post within a group.
type GroupPost struct {
	ID        int       `json:"id"`
	GroupID   int       `json:"group_id"`
	UserID    int       `json:"user_id"`
	Content   string    `json:"content"`
	Image     string    `json:"image,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	User      *User     `json:"user,omitempty"`
	CommentCount int    `json:"comment_count,omitempty"`
}

// GroupPostComment represents a comment on a group post.
type GroupPostComment struct {
	ID          int       `json:"id"`
	GroupPostID int       `json:"group_post_id"`
	UserID      int       `json:"user_id"`
	Content     string    `json:"content"`
	Image       string    `json:"image,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	User        *User     `json:"user,omitempty"`
}

// GroupEvent represents an event created within a group.
type GroupEvent struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DayTime     time.Time `json:"day_time"`
	CreatorID   int       `json:"creator_id"`
	CreatedAt   time.Time `json:"created_at"`
	Creator     *User     `json:"creator,omitempty"`
	Responses   []EventResponse `json:"responses,omitempty"`
}

// EventResponse represents a user's response to an event.
type EventResponse struct {
	ID        int       `json:"id"`
	EventID   int       `json:"event_id"`
	UserID    int       `json:"user_id"`
	Response  string    `json:"response"` // going, not_going
	CreatedAt time.Time `json:"created_at"`
	User      *User     `json:"user,omitempty"`
}

// Notification represents a user notification.
type Notification struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	Type          string    `json:"type"`
	Content       string    `json:"content"`
	RelatedUserID int       `json:"related_user_id,omitempty"`
	RelatedGroupID int      `json:"related_group_id,omitempty"`
	IsRead        bool      `json:"is_read"`
	CreatedAt     time.Time `json:"created_at"`
}

// Message represents a chat message.
type Message struct {
	ID         int       `json:"id"`
	SenderID   int       `json:"sender_id"`
	ReceiverID *int      `json:"receiver_id,omitempty"`
	GroupID    *int      `json:"group_id,omitempty"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}