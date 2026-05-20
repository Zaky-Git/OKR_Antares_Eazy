package objective

import "time"

type CreateRequest struct {
	PeriodID    uint   `json:"period_id" binding:"required"`
	Title       string `json:"title" binding:"required,max=255"`
	Description string `json:"description"`
}

type UpdateRequest struct {
	Title       *string `json:"title" binding:"omitempty,max=255"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
}

type ObjectiveResponse struct {
	ID          uint      `json:"id"`
	PeriodID    uint      `json:"period_id"`
	Title       string    `json:"title"`
	Description *string   `json:"description"`
	Progress    float64   `json:"progress"`
	Status      string    `json:"status"`
	SortOrder   int       `json:"sort_order"`
	CreatedBy   uint      `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func ToObjectiveResponse(o *Objective) ObjectiveResponse {
	return ObjectiveResponse{
		ID:          o.ID,
		PeriodID:    o.PeriodID,
		Title:       o.Title,
		Description: o.Description,
		Progress:    o.Progress,
		Status:      o.Status,
		SortOrder:   o.SortOrder,
		CreatedBy:   o.CreatedBy,
		CreatedAt:   o.CreatedAt,
		UpdatedAt:   o.UpdatedAt,
	}
}

func ToObjectiveResponses(objectives []Objective) []ObjectiveResponse {
	responses := make([]ObjectiveResponse, len(objectives))
	for i, o := range objectives {
		responses[i] = ToObjectiveResponse(&o)
	}
	return responses
}
