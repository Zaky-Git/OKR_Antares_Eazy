package division

import "time"

type CreateRequest struct {
	Name        string  `json:"name" binding:"required"`
	Code        string  `json:"code" binding:"required"`
	Description *string `json:"description"`
	Color       string  `json:"color" binding:"required"`
	IsActive    *bool   `json:"is_active"`
}

type UpdateRequest struct {
	Name        *string `json:"name"`
	Code        *string `json:"code"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	IsActive    *bool   `json:"is_active"`
}

type DivisionResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description *string   `json:"description"`
	Color       string    `json:"color"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type FieldErrors map[string]string

func ToResponse(d *Division) DivisionResponse {
	return DivisionResponse{
		ID:          d.ID,
		Name:        d.Name,
		Code:        d.Code,
		Description: d.Description,
		Color:       d.Color,
		IsActive:    d.IsActive,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}

func ToResponses(items []Division) []DivisionResponse {
	out := make([]DivisionResponse, len(items))
	for i, d := range items {
		out[i] = ToResponse(&d)
	}
	return out
}
