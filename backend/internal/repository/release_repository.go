package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ravi/release-tool/backend/internal/model"
)

type ReleaseRepository struct {
	pool *pgxpool.Pool
}

func NewReleaseRepository(pool *pgxpool.Pool) *ReleaseRepository {
	return &ReleaseRepository{pool: pool}
}

func (r *ReleaseRepository) List(ctx context.Context) ([]model.Release, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, due_date, additional_info, steps_state, created_at, updated_at
		FROM releases
		ORDER BY due_date ASC, created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("query releases: %w", err)
	}
	defer rows.Close()

	releases := make([]model.Release, 0)
	for rows.Next() {
		release, err := scanRelease(rows.Scan)
		if err != nil {
			return nil, err
		}
		releases = append(releases, release)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate releases: %w", err)
	}
	return releases, nil
}

func (r *ReleaseRepository) GetByID(ctx context.Context, id string) (model.Release, error) {
	release, err := scanRelease(func(dest ...any) error {
		return r.pool.QueryRow(ctx, `
			SELECT id, name, due_date, additional_info, steps_state, created_at, updated_at
			FROM releases
			WHERE id = $1
		`, id).Scan(dest...)
	})
	if err != nil {
		return model.Release{}, fmt.Errorf("get release %s: %w", id, err)
	}
	return release, nil
}

func (r *ReleaseRepository) Create(ctx context.Context, release model.Release) (model.Release, error) {
	stepsState, err := json.Marshal(model.NormalizeStepsState(release.StepsState))
	if err != nil {
		return model.Release{}, fmt.Errorf("marshal steps state: %w", err)
	}

	created, err := scanRelease(func(dest ...any) error {
		return r.pool.QueryRow(ctx, `
			INSERT INTO releases (id, name, due_date, additional_info, steps_state)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, name, due_date, additional_info, steps_state, created_at, updated_at
		`, release.ID, release.Name, release.DueDate, nullableText(release.AdditionalInfo), stepsState).Scan(dest...)
	})
	if err != nil {
		return model.Release{}, fmt.Errorf("create release: %w", err)
	}
	return created, nil
}

func (r *ReleaseRepository) UpdateAdditionalInfo(ctx context.Context, id, additionalInfo string) (model.Release, error) {
	updated, err := scanRelease(func(dest ...any) error {
		return r.pool.QueryRow(ctx, `
			UPDATE releases
			SET additional_info = $2,
			    updated_at = NOW()
			WHERE id = $1
			RETURNING id, name, due_date, additional_info, steps_state, created_at, updated_at
		`, id, nullableText(additionalInfo)).Scan(dest...)
	})
	if err != nil {
		return model.Release{}, fmt.Errorf("update release info %s: %w", id, err)
	}
	return updated, nil
}

func (r *ReleaseRepository) UpdateSteps(ctx context.Context, id string, state map[string]bool) (model.Release, error) {
	stepsState, err := json.Marshal(model.NormalizeStepsState(state))
	if err != nil {
		return model.Release{}, fmt.Errorf("marshal steps state: %w", err)
	}

	updated, err := scanRelease(func(dest ...any) error {
		return r.pool.QueryRow(ctx, `
			UPDATE releases
			SET steps_state = $2,
			    updated_at = NOW()
			WHERE id = $1
			RETURNING id, name, due_date, additional_info, steps_state, created_at, updated_at
		`, id, stepsState).Scan(dest...)
	})
	if err != nil {
		return model.Release{}, fmt.Errorf("update steps %s: %w", id, err)
	}
	return updated, nil
}

func (r *ReleaseRepository) Delete(ctx context.Context, id string) error {
	commandTag, err := r.pool.Exec(ctx, `DELETE FROM releases WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete release %s: %w", id, err)
	}
	if commandTag.RowsAffected() == 0 {
		return fmt.Errorf("release not found")
	}
	return nil
}

type scanner func(dest ...any) error

func scanRelease(scan scanner) (model.Release, error) {
	var (
		release         model.Release
		additionalInfo  *string
		stepsStateBytes []byte
	)

	if err := scan(
		&release.ID,
		&release.Name,
		&release.DueDate,
		&additionalInfo,
		&stepsStateBytes,
		&release.CreatedAt,
		&release.UpdatedAt,
	); err != nil {
		return model.Release{}, err
	}

	if additionalInfo != nil {
		release.AdditionalInfo = *additionalInfo
	}

	release.StepsState = model.NewDefaultStepsState()
	if len(stepsStateBytes) > 0 {
		if err := json.Unmarshal(stepsStateBytes, &release.StepsState); err != nil {
			return model.Release{}, fmt.Errorf("unmarshal steps state: %w", err)
		}
		release.StepsState = model.NormalizeStepsState(release.StepsState)
	}
	release.Status = model.ComputeStatus(release.StepsState)
	return release, nil
}

func nullableText(value string) any {
	if value == "" {
		return nil
	}
	return value
}
