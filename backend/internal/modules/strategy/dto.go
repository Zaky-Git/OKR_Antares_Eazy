package strategy

import "time"

type CreateRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	Color       string  `json:"color" binding:"required"`
	SortOrder   *int    `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

type UpdateRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	SortOrder   *int    `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

type StrategyResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Color       string    `json:"color"`
	SortOrder   int       `json:"sort_order"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type FieldErrors map[string]string

func ToResponse(s *Strategy) StrategyResponse {
	return StrategyResponse{
		ID:          s.ID,
		Name:        s.Name,
		Description: s.Description,
		Color:       s.Color,
		SortOrder:   s.SortOrder,
		IsActive:    s.IsActive,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}

func ToResponses(items []Strategy) []StrategyResponse {
	out := make([]StrategyResponse, len(items))
	for i, s := range items {
		out[i] = ToResponse(&s)
	}
	return out
}
