package model

import "time"

type ReleaseStatus string

const (
	ReleaseStatusPlanned ReleaseStatus = "planned"
	ReleaseStatusOngoing ReleaseStatus = "ongoing"
	ReleaseStatusDone    ReleaseStatus = "done"
)

type StepDefinition struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

type Release struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	DueDate        time.Time       `json:"dueDate"`
	Status         ReleaseStatus   `json:"status"`
	AdditionalInfo string          `json:"additionalInfo"`
	StepsState     map[string]bool `json:"stepsState"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

var DefaultSteps = []StepDefinition{
	{Key: "pull_requests_merged", Label: "All relevant pull requests have been merged"},
	{Key: "changelog_updated", Label: "CHANGELOG and release notes are updated"},
	{Key: "tests_passing", Label: "Automated tests are passing"},
	{Key: "staging_verified", Label: "Staging verification is complete"},
	{Key: "monitoring_ready", Label: "Monitoring and alerts are ready"},
	{Key: "rollout_approved", Label: "Rollout plan has been approved"},
	{Key: "production_deployed", Label: "Production deployment is complete"},
	{Key: "post_release_checks", Label: "Post-release checks are complete"},
}

func NewDefaultStepsState() map[string]bool {
	state := make(map[string]bool, len(DefaultSteps))
	for _, step := range DefaultSteps {
		state[step.Key] = false
	}
	return state
}

func NormalizeStepsState(input map[string]bool) map[string]bool {
	state := NewDefaultStepsState()
	for _, step := range DefaultSteps {
		if input == nil {
			continue
		}
		if value, ok := input[step.Key]; ok {
			state[step.Key] = value
		}
	}
	return state
}

func ComputeStatus(state map[string]bool) ReleaseStatus {
	normalized := NormalizeStepsState(state)
	completed := 0
	for _, step := range DefaultSteps {
		if normalized[step.Key] {
			completed++
		}
	}

	if completed == 0 {
		return ReleaseStatusPlanned
	}
	if completed == len(DefaultSteps) {
		return ReleaseStatusDone
	}
	return ReleaseStatusOngoing
}
