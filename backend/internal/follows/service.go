package follows

import (
	"context"
	"errors"
)

var (
	ErrCannotFollowSelf   = errors.New("cannot follow self")
	ErrForbidden          = errors.New("forbidden")
	ErrNotFound           = errors.New("not found")
	ErrRelationshipExists = errors.New("relationship already exists")
	ErrRequestNotPending  = errors.New("follow request is not pending")
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Relationship(ctx context.Context, followerID, followingID int) (*Relationship, error) {
	return s.repo.GetRelationshipByUsers(ctx, followerID, followingID)
}

func (s *Service) Follow(ctx context.Context, followerID, followingID int) (*Relationship, error) {
	if followerID == followingID {
		return nil, ErrCannotFollowSelf
	}

	if _, err := s.repo.GetRelationshipByUsers(ctx, followerID, followingID); err == nil {
		return nil, ErrRelationshipExists
	} else if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	user, err := s.repo.GetUser(ctx, followingID)
	if err != nil {
		return nil, err
	}

	status := FollowPending
	if user.IsPublic {
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

func (s *Service) Accept(ctx context.Context, currentUserID, relationshipID int) (*Relationship, error) {
	return s.updateRequest(ctx, currentUserID, relationshipID, FollowAccepted)
}

func (s *Service) Decline(ctx context.Context, currentUserID, relationshipID int) (*Relationship, error) {
	return s.updateRequest(ctx, currentUserID, relationshipID, FollowDeclined)
}

func (s *Service) updateRequest(ctx context.Context, currentUserID, relationshipID int, status FollowStatus) (*Relationship, error) {
	relationship, err := s.repo.GetRelationshipByID(ctx, relationshipID)
	if err != nil {
		return nil, err
	}

	if relationship.FollowingID != currentUserID {
		return nil, ErrForbidden
	}

	if relationship.Status != FollowPending {
		return nil, ErrRequestNotPending
	}

	return s.repo.UpdateRelationshipStatus(ctx, relationship.ID, status)
}
