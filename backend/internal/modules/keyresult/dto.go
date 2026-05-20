package keyresult

import "time"

type CreateRequest struct {
	Title        string  `json:"title" binding:"required,max=255"`
	Description  string  `json:"description"`
	TargetValue  float64 `json:"target_value" binding:"required,gt=0"`
	CurrentValue float64 `json:"current_value"`
	MetricUnit   string  `json:"metric_unit"`
}

type UpdateRequest struct {
	Title        *string  `json:"title" binding:"omitempty,max=255"`
	Description  *string  `json:"description"`
	TargetValue  *float64 `json:"target_value" binding:"omitempty,gt=0"`
	CurrentValue *float64 `json:"current_value"`
	MetricUnit   *string  `json:"metric_unit"`
	Status       *string  `json:"status"`
}

type KeyResultResponse struct {
	ID           uint      `json:"id"`
	ObjectiveID  uint      `json:"objective_id"`
	Title        string    `json:"title"`
	Description  *string   `json:"description"`
	TargetValue  float64   `json:"target_value"`
	CurrentValue float64   `json:"current_value"`
	MetricUnit   *string   `json:"metric_unit"`
	Progress     float64   `json:"progress"`
	Status       string    `json:"status"`
	CreatedBy    uint      `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func ToKeyResultResponse(kr *KeyResult) KeyResultResponse {
	return KeyResultResponse{
		ID:           kr.ID,
		ObjectiveID:  kr.ObjectiveID,
		Title:        kr.Title,
		Description:  kr.Description,
		TargetValue:  kr.TargetValue,
		CurrentValue: kr.CurrentValue,
		MetricUnit:   kr.MetricUnit,
		Progress:     kr.Progress,
		Status:       kr.Status,
		CreatedBy:    kr.CreatedBy,
		CreatedAt:    kr.CreatedAt,
		UpdatedAt:    kr.UpdatedAt,
	}
}

func ToKeyResultResponses(krs []KeyResult) []KeyResultResponse {
	responses := make([]KeyResultResponse, len(krs))
	for i, kr := range krs {
		responses[i] = ToKeyResultResponse(&kr)
	}
	return responses
}
