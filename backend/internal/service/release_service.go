package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/ravi/release-tool/backend/internal/dto"
	"github.com/ravi/release-tool/backend/internal/model"
	"github.com/ravi/release-tool/backend/internal/repository"
)

type ReleaseService struct {
	repo *repository.ReleaseRepository
}

func NewReleaseService(repo *repository.ReleaseRepository) *ReleaseService {
	return &ReleaseService{repo: repo}
}

func (s *ReleaseService) List(ctx context.Context) ([]model.Release, error) {
	return s.repo.List(ctx)
}

func (s *ReleaseService) GetByID(ctx context.Context, id string) (model.Release, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ReleaseService) Create(ctx context.Context, req dto.CreateReleaseRequest) (model.Release, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return model.Release{}, errors.New("name is required")
	}

	dueDate, err := time.Parse(time.RFC3339, req.DueDate)
	if err != nil {
		return model.Release{}, fmt.Errorf("dueDate must be a valid RFC3339 timestamp: %w", err)
	}

	release := model.Release{
		ID:             uuid.NewString(),
		Name:           name,
		DueDate:        dueDate.UTC(),
		AdditionalInfo: strings.TrimSpace(req.AdditionalInfo),
		StepsState:     model.NewDefaultStepsState(),
	}

	return s.repo.Create(ctx, release)
}

func (s *ReleaseService) UpdateAdditionalInfo(ctx context.Context, id string, req dto.UpdateReleaseRequest) (model.Release, error) {
	if strings.TrimSpace(id) == "" {
		return model.Release{}, errors.New("id is required")
	}
	return s.repo.UpdateAdditionalInfo(ctx, id, strings.TrimSpace(req.AdditionalInfo))
}

func (s *ReleaseService) UpdateSteps(ctx context.Context, id string, req dto.UpdateStepsRequest) (model.Release, error) {
	if strings.TrimSpace(id) == "" {
		return model.Release{}, errors.New("id is required")
	}
	return s.repo.UpdateSteps(ctx, id, model.NormalizeStepsState(req.StepsState))
}

func (s *ReleaseService) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("id is required")
	}
	return s.repo.Delete(ctx, id)
}

func (s *ReleaseService) Steps() []model.StepDefinition {
	return model.DefaultSteps
}
