package follows

import "errors"

type FollowStatus string

const (
	FollowPending  FollowStatus = "pending"
	FollowAccepted FollowStatus = "accepted"
	FollowDeclined FollowStatus = "declined"
)

type User struct {
	ID       int  `json:"id"`
	IsPublic bool `json:"is_public"`
}

type Relationship struct {
	ID          int          `json:"id"`
	FollowerID  int          `json:"follower_id"`
	FollowingID int          `json:"following_id"`
	Status      FollowStatus `json:"status"`
}

var (
	ErrNotFound           = errors.New("not found")
	ErrCannotFollowSelf   = errors.New("cannot follow self")
	ErrRelationshipExists = errors.New("relationship already exists")
	ErrForbidden          = errors.New("forbidden")
)
