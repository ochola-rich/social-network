package follows

import (
	"context"
	"errors"
	"testing"
)

func TestServiceFollowPublicProfileCreatesAcceptedRelationship(t *testing.T) {
	repo := newFakeRepository()
	repo.users[1] = &User{ID: 1, IsPublic: true}
	repo.users[2] = &User{ID: 2, IsPublic: true}

	service := NewService(repo)

	relationship, err := service.Follow(context.Background(), 1, 2)
	if err != nil {
		t.Fatalf("follow returned error: %v", err)
	}

	if relationship.FollowerID != 1 {
		t.Errorf("got follower id %d, want 1", relationship.FollowerID)
	}

	if relationship.FollowingID != 2 {
		t.Errorf("got following id %d, want 2", relationship.FollowingID)
	}

	if relationship.Status != FollowAccepted {
		t.Errorf("got status %q, want %q", relationship.Status, FollowAccepted)
	}
}

func TestServiceFollowPrivateProfileCreatesPendingRelationship(t *testing.T) {
	repo := newFakeRepository()
	repo.users[1] = &User{ID: 1, IsPublic: true}
	repo.users[2] = &User{ID: 2, IsPublic: false}

	service := NewService(repo)

	relationship, err := service.Follow(context.Background(), 1, 2)
	if err != nil {
		t.Fatalf("follow returned error: %v", err)
	}

	if relationship.Status != FollowPending {
		t.Errorf("got status %q, want %q", relationship.Status, FollowPending)
	}
}

func TestServiceFollowRejectsSelfFollow(t *testing.T) {
	repo := newFakeRepository()
	repo.users[1] = &User{ID: 1, IsPublic: true}

	service := NewService(repo)

	_, err := service.Follow(context.Background(), 1, 1)
	if !errors.Is(err, ErrCannotFollowSelf) {
		t.Fatalf("got error %v, want %v", err, ErrCannotFollowSelf)
	}
}

func TestServiceFollowRejectsDuplicateRelationship(t *testing.T) {
	repo := newFakeRepository()
	repo.users[1] = &User{ID: 1, IsPublic: true}
	repo.users[2] = &User{ID: 2, IsPublic: false}
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowPending,
	}

	service := NewService(repo)

	_, err := service.Follow(context.Background(), 1, 2)
	if !errors.Is(err, ErrRelationshipExists) {
		t.Fatalf("got error %v, want %v", err, ErrRelationshipExists)
	}
}

func TestServiceUnfollowDeletesExistingRelationship(t *testing.T) {
	repo := newFakeRepository()
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowAccepted,
	}

	service := NewService(repo)

	if err := service.Unfollow(context.Background(), 1, 2); err != nil {
		t.Fatalf("unfollow returned error: %v", err)
	}

	if _, ok := repo.relationships[1]; ok {
		t.Fatal("expected relationship to be deleted")
	}
}

func TestServiceAcceptAllowsTargetUserToAcceptPendingRequest(t *testing.T) {
	repo := newFakeRepository()
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowPending,
	}

	service := NewService(repo)

	relationship, err := service.Accept(context.Background(), 2, 1)
	if err != nil {
		t.Fatalf("accept returned error: %v", err)
	}

	if relationship.Status != FollowAccepted {
		t.Errorf("got status %q, want %q", relationship.Status, FollowAccepted)
	}
}

func TestServiceAcceptRejectsNonTargetUser(t *testing.T) {
	repo := newFakeRepository()
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowPending,
	}

	service := NewService(repo)

	_, err := service.Accept(context.Background(), 3, 1)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("got error %v, want %v", err, ErrForbidden)
	}
}

func TestServiceDeclineAllowsTargetUserToDeclinePendingRequest(t *testing.T) {
	repo := newFakeRepository()
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowPending,
	}

	service := NewService(repo)

	relationship, err := service.Decline(context.Background(), 2, 1)
	if err != nil {
		t.Fatalf("decline returned error: %v", err)
	}

	if relationship.Status != FollowDeclined {
		t.Errorf("got status %q, want %q", relationship.Status, FollowDeclined)
	}
}

func TestServiceRelationshipReturnsExistingRelationship(t *testing.T) {
	repo := newFakeRepository()
	repo.relationships[1] = &Relationship{
		ID:          1,
		FollowerID:  1,
		FollowingID: 2,
		Status:      FollowAccepted,
	}

	service := NewService(repo)

	relationship, err := service.Relationship(context.Background(), 1, 2)
	if err != nil {
		t.Fatalf("relationship returned error: %v", err)
	}

	if relationship.ID != 1 {
		t.Errorf("got relationship id %d, want 1", relationship.ID)
	}
}

type fakeRepository struct {
	users         map[int]*User
	relationships map[int]*Relationship
	nextID        int
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		users:         make(map[int]*User),
		relationships: make(map[int]*Relationship),
		nextID:        1,
	}
}

func (r *fakeRepository) GetUser(ctx context.Context, userID int) (*User, error) {
	user, ok := r.users[userID]
	if !ok {
		return nil, ErrNotFound
	}

	return user, nil
}

func (r *fakeRepository) GetRelationshipByUsers(ctx context.Context, followerID, followingID int) (*Relationship, error) {
	for _, relationship := range r.relationships {
		if relationship.FollowerID == followerID && relationship.FollowingID == followingID {
			copy := *relationship
			return &copy, nil
		}
	}

	return nil, ErrNotFound
}

func (r *fakeRepository) GetRelationshipByID(ctx context.Context, relationshipID int) (*Relationship, error) {
	relationship, ok := r.relationships[relationshipID]
	if !ok {
		return nil, ErrNotFound
	}

	copy := *relationship
	return &copy, nil
}

func (r *fakeRepository) CreateRelationship(ctx context.Context, followerID, followingID int, status FollowStatus) (*Relationship, error) {
	for _, relationship := range r.relationships {
		if relationship.FollowerID == followerID && relationship.FollowingID == followingID {
			return nil, ErrRelationshipExists
		}
	}

	relationship := &Relationship{
		ID:          r.nextID,
		FollowerID:  followerID,
		FollowingID: followingID,
		Status:      status,
	}

	r.relationships[relationship.ID] = relationship
	r.nextID++

	copy := *relationship
	return &copy, nil
}

func (r *fakeRepository) UpdateRelationshipStatus(ctx context.Context, relationshipID int, status FollowStatus) (*Relationship, error) {
	relationship, ok := r.relationships[relationshipID]
	if !ok {
		return nil, ErrNotFound
	}

	relationship.Status = status

	copy := *relationship
	return &copy, nil
}

func (r *fakeRepository) DeleteRelationship(ctx context.Context, relationshipID int) error {
	if _, ok := r.relationships[relationshipID]; !ok {
		return ErrNotFound
	}

	delete(r.relationships, relationshipID)
	return nil
}
