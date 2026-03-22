package dto

type CreateReleaseRequest struct {
	Name           string `json:"name"`
	DueDate        string `json:"dueDate"`
	AdditionalInfo string `json:"additionalInfo"`
}

type UpdateReleaseRequest struct {
	AdditionalInfo string `json:"additionalInfo"`
}

type UpdateStepsRequest struct {
	StepsState map[string]bool `json:"stepsState"`
}
