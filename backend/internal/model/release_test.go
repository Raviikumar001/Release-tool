package model

import "testing"

func TestComputeStatus(t *testing.T) {
	planned := ComputeStatus(NewDefaultStepsState())
	if planned != ReleaseStatusPlanned {
		t.Fatalf("expected planned, got %s", planned)
	}

	ongoingState := NewDefaultStepsState()
	ongoingState[DefaultSteps[0].Key] = true
	ongoing := ComputeStatus(ongoingState)
	if ongoing != ReleaseStatusOngoing {
		t.Fatalf("expected ongoing, got %s", ongoing)
	}

	doneState := NewDefaultStepsState()
	for _, step := range DefaultSteps {
		doneState[step.Key] = true
	}
	done := ComputeStatus(doneState)
	if done != ReleaseStatusDone {
		t.Fatalf("expected done, got %s", done)
	}
}
