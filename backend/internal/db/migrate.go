package db

import (
	"context"
	"embed"
	"fmt"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}

	filenames := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		filenames = append(filenames, filepath.Join("migrations", entry.Name()))
	}
	sort.Strings(filenames)

	for _, name := range filenames {
		content, err := migrationFiles.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}

		queries := splitSQLStatements(string(content))
		for _, query := range queries {
			if _, err := pool.Exec(ctx, query); err != nil {
				return fmt.Errorf("execute migration %s: %w", name, err)
			}
		}
	}

	return nil
}

func splitSQLStatements(sql string) []string {
	parts := strings.Split(sql, ";")
	queries := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		queries = append(queries, trimmed)
	}
	return queries
}
