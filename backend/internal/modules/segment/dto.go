package segment

import "time"

type CreateRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	Color       string  `json:"color" binding:"required"`
	IsActive    *bool   `json:"is_active"`
}

type UpdateRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	IsActive    *bool   `json:"is_active"`
}

type SegmentResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Color       string    `json:"color"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type FieldErrors map[string]string

func ToResponse(s *Segment) SegmentResponse {
	return SegmentResponse{
		ID:          s.ID,
		Name:        s.Name,
		Description: s.Description,
		Color:       s.Color,
		IsActive:    s.IsActive,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}

func ToResponses(items []Segment) []SegmentResponse {
	out := make([]SegmentResponse, len(items))
	for i, s := range items {
		out[i] = ToResponse(&s)
	}
	return out
}
