package follows

import "context"

type Repository interface {
	GetUser(ctx context.Context, userID int) (*User, error)
	GetRelationshipByUsers(ctx context.Context, followerID, followingID int) (*Relationship, error)
	GetRelationshipByID(ctx context.Context, relationshipID int) (*Relationship, error)
	CreateRelationship(ctx context.Context, followerID, followingID int, status FollowStatus) (*Relationship, error)
	UpdateRelationshipStatus(ctx context.Context, relationshipID int, status FollowStatus) (*Relationship, error)
	DeleteRelationship(ctx context.Context, relationshipID int) error
}
