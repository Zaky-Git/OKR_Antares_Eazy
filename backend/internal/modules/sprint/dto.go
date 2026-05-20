package sprint

import "time"

type CreateRequest struct {
	PeriodID  uint   `json:"period_id" binding:"required"`
	Name      string `json:"name" binding:"required,max=100"`
	Goal      string `json:"goal"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
}

type UpdateRequest struct {
	Name      *string `json:"name" binding:"omitempty,max=100"`
	Goal      *string `json:"goal"`
	StartDate *string `json:"start_date"`
	EndDate   *string `json:"end_date"`
}

type CompleteRequest struct {
	ReviewNote *string `json:"review_note"`
	RetroNote  *string `json:"retro_note"`
}

type SprintResponse struct {
	ID         uint      `json:"id"`
	PeriodID   uint      `json:"period_id"`
	Name       string    `json:"name"`
	Goal       *string   `json:"goal"`
	StartDate  time.Time `json:"start_date"`
	EndDate    time.Time `json:"end_date"`
	Status     string    `json:"status"`
	ReviewNote *string   `json:"review_note"`
	RetroNote  *string   `json:"retro_note"`
	CreatedBy  uint      `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func ToSprintResponse(s *Sprint) SprintResponse {
	return SprintResponse{
		ID:         s.ID,
		PeriodID:   s.PeriodID,
		Name:       s.Name,
		Goal:       s.Goal,
		StartDate:  s.StartDate,
		EndDate:    s.EndDate,
		Status:     s.Status,
		ReviewNote: s.ReviewNote,
		RetroNote:  s.RetroNote,
		CreatedBy:  s.CreatedBy,
		CreatedAt:  s.CreatedAt,
		UpdatedAt:  s.UpdatedAt,
	}
}

func ToSprintResponses(sprints []Sprint) []SprintResponse {
	responses := make([]SprintResponse, len(sprints))
	for i, s := range sprints {
		responses[i] = ToSprintResponse(&s)
	}
	return responses
}
