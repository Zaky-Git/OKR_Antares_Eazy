package keyresult

import "time"

type CreateRequest struct {
	Title         string   `json:"title" binding:"required,max=255"`
	Description   string   `json:"description"`
	KRType        *string  `json:"kr_type"`
	TargetValue   float64  `json:"target_value"`
	CurrentValue  float64  `json:"current_value"`
	BaselineValue *float64 `json:"baseline_value"`
	MetricUnit    string   `json:"metric_unit"`
	DueDate       *string  `json:"due_date"`
	Notes         *string  `json:"notes"`
}

type UpdateRequest struct {
	Title         *string  `json:"title" binding:"omitempty,max=255"`
	Description   *string  `json:"description"`
	KRType        *string  `json:"kr_type"`
	TargetValue   *float64 `json:"target_value"`
	CurrentValue  *float64 `json:"current_value"`
	BaselineValue *float64 `json:"baseline_value"`
	MetricUnit    *string  `json:"metric_unit"`
	DueDate       *string  `json:"due_date"`
	Notes         *string  `json:"notes"`
	Status        *string  `json:"status"`
}

type KeyResultResponse struct {
	ID            uint      `json:"id"`
	ObjectiveID   uint      `json:"objective_id"`
	Title         string    `json:"title"`
	Description   *string   `json:"description"`
	KRType        string    `json:"kr_type"`
	TargetValue   float64   `json:"target_value"`
	CurrentValue  float64   `json:"current_value"`
	BaselineValue *float64  `json:"baseline_value"`
	MetricUnit    *string   `json:"metric_unit"`
	DueDate       *string   `json:"due_date"`
	Notes         *string   `json:"notes"`
	Progress      float64   `json:"progress"`
	Status        string    `json:"status"`
	CreatedBy     uint      `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func ToKeyResultResponse(kr *KeyResult) KeyResultResponse {
	return KeyResultResponse{
		ID:            kr.ID,
		ObjectiveID:   kr.ObjectiveID,
		Title:         kr.Title,
		Description:   kr.Description,
		KRType:        kr.EffectiveType(),
		TargetValue:   kr.TargetValue,
		CurrentValue:  kr.CurrentValue,
		BaselineValue: kr.BaselineValue,
		MetricUnit:    kr.MetricUnit,
		DueDate:       kr.DueDate,
		Notes:         kr.Notes,
		Progress:      kr.Progress,
		Status:        kr.Status,
		CreatedBy:     kr.CreatedBy,
		CreatedAt:     kr.CreatedAt,
		UpdatedAt:     kr.UpdatedAt,
	}
}

func ToKeyResultResponses(krs []KeyResult) []KeyResultResponse {
	responses := make([]KeyResultResponse, len(krs))
	for i, kr := range krs {
		responses[i] = ToKeyResultResponse(&kr)
	}
	return responses
}
