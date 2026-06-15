package follows

import (
	"context"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Follow(ctx context.Context, followerID, followingID int) (*Relationship, error) {
	if followerID == followingID {
		return nil, ErrCannotFollowSelf
	}

	// Check if relationship already exists
	existing, err := s.repo.GetRelationshipByUsers(ctx, followerID, followingID)
	if err == nil && existing != nil {
		return nil, ErrRelationshipExists
	}

	// Get the user to be followed
	followingUser, err := s.repo.GetUser(ctx, followingID)
	if err != nil {
		return nil, err
	}

	// Determine initial status based on target user's privacy
	status := FollowPending
	if followingUser.IsPublic {
		status = FollowAccepted
	}

	return s.repo.CreateRelationship(ctx, followerID, followingID, status)
}

func (s *Service) Unfollow(ctx context.Context, followerID, followingID int) error {
	relationship, err := s.repo.GetRelationshipByUsers(ctx, followerID, followingID)
	if err != nil {
		return err
	}

	return s.repo.DeleteRelationship(ctx, relationship.ID)
}

func (s *Service) Accept(ctx context.Context, targetUserID, followerID int) (*Relationship, error) {
	relationship, err := s.repo.GetRelationshipByUsers(ctx, followerID, targetUserID)
	if err != nil {
		return nil, ErrForbidden
	}

	if relationship.FollowingID != targetUserID {
		return nil, ErrForbidden
	}

	return s.repo.UpdateRelationshipStatus(ctx, relationship.ID, FollowAccepted)
}

func (s *Service) Decline(ctx context.Context, targetUserID, followerID int) (*Relationship, error) {
	relationship, err := s.repo.GetRelationshipByUsers(ctx, followerID, targetUserID)
	if err != nil {
		return nil, ErrForbidden
	}

	if relationship.FollowingID != targetUserID {
		return nil, ErrForbidden
	}

	return s.repo.UpdateRelationshipStatus(ctx, relationship.ID, FollowDeclined)
}

func (s *Service) Relationship(ctx context.Context, followerID, followingID int) (*Relationship, error) {
	return s.repo.GetRelationshipByUsers(ctx, followerID, followingID)
}
