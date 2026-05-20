package initiative

import "time"

type CreateRequest struct {
	Title       string `json:"title" binding:"required,max=255"`
	Description string `json:"description"`
	AssigneeID  *uint  `json:"assignee_id"`
	SprintID    *uint  `json:"sprint_id"`
	DueDate     string `json:"due_date"`
}

type UpdateRequest struct {
	Title       *string `json:"title" binding:"omitempty,max=255"`
	Description *string `json:"description"`
	AssigneeID  *uint   `json:"assignee_id"`
	SprintID    *uint   `json:"sprint_id"`
	Status      *string `json:"status"`
	DueDate     *string `json:"due_date"`
}

type ProgressUpdateRequest struct {
	Progress float64 `json:"progress" binding:"min=0,max=100"`
	Note     string  `json:"note"`
	Blocker  string  `json:"blocker"`
}

type InitiativeResponse struct {
	ID          uint                 `json:"id"`
	KeyResultID uint                 `json:"key_result_id"`
	SprintID    *uint                `json:"sprint_id"`
	ParentID    *uint                `json:"parent_id"`
	Title       string               `json:"title"`
	Description *string              `json:"description"`
	AssigneeID  *uint                `json:"assignee_id"`
	Progress    float64              `json:"progress"`
	Status      string               `json:"status"`
	DueDate     *time.Time           `json:"due_date"`
	CreatedBy   uint                 `json:"created_by"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
	Children    []InitiativeResponse `json:"children,omitempty"`
}

func ToInitiativeResponse(i *Initiative) InitiativeResponse {
	resp := InitiativeResponse{
		ID:          i.ID,
		KeyResultID: i.KeyResultID,
		SprintID:    i.SprintID,
		ParentID:    i.ParentID,
		Title:       i.Title,
		Description: i.Description,
		AssigneeID:  i.AssigneeID,
		Progress:    i.Progress,
		Status:      i.Status,
		DueDate:     i.DueDate,
		CreatedBy:   i.CreatedBy,
		CreatedAt:   i.CreatedAt,
		UpdatedAt:   i.UpdatedAt,
	}

	if len(i.Children) > 0 {
		resp.Children = make([]InitiativeResponse, len(i.Children))
		for idx, child := range i.Children {
			resp.Children[idx] = ToInitiativeResponse(&child)
		}
	}

	return resp
}

func ToInitiativeResponses(initiatives []Initiative) []InitiativeResponse {
	responses := make([]InitiativeResponse, len(initiatives))
	for i, init := range initiatives {
		responses[i] = ToInitiativeResponse(&init)
	}
	return responses
}
