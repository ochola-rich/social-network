package follows

type FollowStatus string

const (
	FollowPending  FollowStatus = "pending"
	FollowAccepted FollowStatus = "accepted"
	FollowDeclined FollowStatus = "declined"
)

type User struct {
	ID       int
	IsPublic bool
}

type Relationship struct {
	ID          int
	FollowerID  int
	FollowingID int
	Status      FollowStatus
}
