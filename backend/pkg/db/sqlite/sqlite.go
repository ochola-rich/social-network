package sqlite

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// DB wraps the sql.DB connection.
type DB struct {
	*sql.DB
}

// New opens (or creates) the SQLite database, runs migrations, and returns a DB handle.
func New(dbPath string) (*DB, error) {
	// Ensure the directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create db directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Enable WAL mode for better concurrent performance
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, fmt.Errorf("enable WAL: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	wrapper := &DB{db}
	if err := wrapper.runMigrations(); err != nil {
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	return wrapper, nil
}

// runMigrations reads all .up.sql files from the migrations directory and applies
// them in order if they haven't been applied yet.
func (db *DB) runMigrations() error {
	// Create migrations tracking table
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`); err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	// Read the migrations directory
	// Try multiple possible paths (relative to working dir or absolute)
	migrationDirs := []string{
		"backend/pkg/db/migrations/sqlite",
		"pkg/db/migrations/sqlite",
		"../pkg/db/migrations/sqlite",
		"../../pkg/db/migrations/sqlite",
	}

	var migrationDir string
	for _, dir := range migrationDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			migrationDir = dir
			break
		}
	}

	if migrationDir == "" {
		// Try to find the migrations directory by searching
		cwd, _ := os.Getwd()
		log.Printf("Looking for migrations from cwd: %s", cwd)
		// Check common locations
		for _, dir := range []string{
			filepath.Join(cwd, "backend/pkg/db/migrations/sqlite"),
			filepath.Join(cwd, "pkg/db/migrations/sqlite"),
			filepath.Join(cwd, "../../pkg/db/migrations/sqlite"),
		} {
			if info, err := os.Stat(dir); err == nil && info.IsDir() {
				migrationDir = dir
				break
			}
		}
	}

	if migrationDir == "" {
		return fmt.Errorf("migrations directory not found")
	}

	entries, err := os.ReadDir(migrationDir)
	if err != nil {
		return fmt.Errorf("read migrations directory: %w", err)
	}

	// Collect .up.sql files
	var upFiles []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			upFiles = append(upFiles, e.Name())
		}
	}
	sort.Strings(upFiles)

	for _, fname := range upFiles {
		// Extract version number from filename (e.g., "000001_create_users_table.up.sql" -> 1)
		version := 0
		if _, err := fmt.Sscanf(fname, "%d", &version); err != nil || version == 0 {
			log.Printf("Skipping migration file with unparseable version: %s", fname)
			continue
		}

		// Check if already applied
		var count int
		if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = ?", version).Scan(&count); err != nil {
			return fmt.Errorf("check migration %d: %w", version, err)
		}
		if count > 0 {
			continue
		}

		// Read and apply migration
		content, err := os.ReadFile(filepath.Join(migrationDir, fname))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", fname, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("begin transaction for %s: %w", fname, err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("apply migration %s: %w", fname, err)
		}

		if _, err := tx.Exec("INSERT INTO schema_migrations (version) VALUES (?)", version); err != nil {
			tx.Rollback()
			return fmt.Errorf("record migration %d: %w", version, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", fname, err)
		}

		log.Printf("Applied migration: %s", fname)
	}

	return nil
}

// Close closes the database connection.
func (db *DB) Close() error {
	return db.DB.Close()
}