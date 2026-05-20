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

// SprintInitiativeResponse represents an initiative with parent context for sprint board display
type SprintInitiativeResponse struct {
	ID             uint    `json:"id"`
	KeyResultID    uint    `json:"key_result_id"`
	SprintID       *uint   `json:"sprint_id"`
	ParentID       *uint   `json:"parent_id"`
	Title          string  `json:"title"`
	Description    *string `json:"description"`
	AssigneeID     *uint   `json:"assignee_id"`
	AssigneeName   *string `json:"assignee_name"`
	Progress       float64 `json:"progress"`
	Status         string  `json:"status"`
	DueDate        *string `json:"due_date"`
	ObjectiveTitle string  `json:"objective_title"`
	KeyResultTitle string  `json:"key_result_title"`
	CreatedBy      uint    `json:"created_by"`
}

// SprintSummaryResponse represents aggregate sprint progress metrics
type SprintSummaryResponse struct {
	TotalInitiatives int     `json:"total_initiatives"`
	TodoCount        int     `json:"todo_count"`
	InProgressCount  int     `json:"in_progress_count"`
	BlockedCount     int     `json:"blocked_count"`
	DoneCount        int     `json:"done_count"`
	CancelledCount   int     `json:"cancelled_count"`
	SprintProgress   float64 `json:"sprint_progress"`
}

// CarryOverRequest represents the request to carry over initiatives to the next sprint
type CarryOverRequest struct {
	InitiativeIDs []uint `json:"initiative_ids" binding:"required"`
}

// CarryOverResponse represents the result of a carry-over operation
type CarryOverResponse struct {
	CarriedCount     int    `json:"carried_count"`
	TargetSprintID   uint   `json:"target_sprint_id"`
	TargetSprintName string `json:"target_sprint_name"`
}

// AssignSprintRequest represents a request to assign an initiative to a sprint
type AssignSprintRequest struct {
	SprintID uint `json:"sprint_id" binding:"required"`
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
