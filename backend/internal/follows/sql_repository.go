package follows

import (
	"context"
	"database/sql"
	"errors"
)

type SQLRepository struct {
	db *sql.DB
}

func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db}
}

func (r *SQLRepository) GetUser(ctx context.Context, userID int) (*User, error) {
	var user User
	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, is_public FROM users WHERE id = ?`,
		userID,
	).Scan(&user.ID, &user.IsPublic)
	if err != nil {
		return nil, mapSQLError(err)
	}

	return &user, nil
}

func (r *SQLRepository) GetRelationshipByUsers(ctx context.Context, followerID, followingID int) (*Relationship, error) {
	var relationship Relationship
	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, follower_id, following_id, status
		 FROM follows
		 WHERE follower_id = ? AND following_id = ?`,
		followerID,
		followingID,
	).Scan(
		&relationship.ID,
		&relationship.FollowerID,
		&relationship.FollowingID,
		&relationship.Status,
	)
	if err != nil {
		return nil, mapSQLError(err)
	}

	return &relationship, nil
}

func (r *SQLRepository) GetRelationshipByID(ctx context.Context, relationshipID int) (*Relationship, error) {
	var relationship Relationship
	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, follower_id, following_id, status
		 FROM follows
		 WHERE id = ?`,
		relationshipID,
	).Scan(
		&relationship.ID,
		&relationship.FollowerID,
		&relationship.FollowingID,
		&relationship.Status,
	)
	if err != nil {
		return nil, mapSQLError(err)
	}

	return &relationship, nil
}

func (r *SQLRepository) CreateRelationship(ctx context.Context, followerID, followingID int, status FollowStatus) (*Relationship, error) {
	result, err := r.db.ExecContext(
		ctx,
		`INSERT INTO follows (follower_id, following_id, status)
		 VALUES (?, ?, ?)`,
		followerID,
		followingID,
		status,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &Relationship{
		ID:          int(id),
		FollowerID:  followerID,
		FollowingID: followingID,
		Status:      status,
	}, nil
}

func (r *SQLRepository) UpdateRelationshipStatus(ctx context.Context, relationshipID int, status FollowStatus) (*Relationship, error) {
	result, err := r.db.ExecContext(
		ctx,
		`UPDATE follows
		 SET status = ?
		 WHERE id = ?`,
		status,
		relationshipID,
	)
	if err != nil {
		return nil, err
	}

	if err := requireAffectedRow(result); err != nil {
		return nil, err
	}

	return r.GetRelationshipByID(ctx, relationshipID)
}

func (r *SQLRepository) DeleteRelationship(ctx context.Context, relationshipID int) error {
	result, err := r.db.ExecContext(
		ctx,
		`DELETE FROM follows WHERE id = ?`,
		relationshipID,
	)
	if err != nil {
		return err
	}

	return requireAffectedRow(result)
}

func mapSQLError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}

	return err
}

func requireAffectedRow(result sql.Result) error {
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
