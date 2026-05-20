package objective

import (
	"bytes"
	"encoding/json"
	"time"
)

// PatchableUint distinguishes "absent key" vs "key present with null value" in PATCH payloads.
type PatchableUint struct {
	Present bool
	Value   *uint
}

func (p *PatchableUint) UnmarshalJSON(data []byte) error {
	p.Present = true
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		p.Value = nil
		return nil
	}
	var v uint
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	p.Value = &v
	return nil
}

// PatchableString same semantics as PatchableUint but for string fields.
type PatchableString struct {
	Present bool
	Value   *string
}

func (p *PatchableString) UnmarshalJSON(data []byte) error {
	p.Present = true
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		p.Value = nil
		return nil
	}
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	p.Value = &v
	return nil
}

type CreateRequest struct {
	PeriodID    uint    `json:"period_id" binding:"required"`
	Title       string  `json:"title" binding:"required,max=255"`
	Description string  `json:"description"`
	StrategyID  *uint   `json:"strategy_id"`
	SegmentID   *uint   `json:"segment_id"`
	DivisionID  *uint   `json:"division_id"`
	OwnerID     *uint   `json:"owner_id"`
	Notes       *string `json:"notes"`
}

type UpdateRequest struct {
	Title       *string         `json:"title" binding:"omitempty,max=255"`
	Description *string         `json:"description"`
	Status      *string         `json:"status"`
	StrategyID  PatchableUint   `json:"strategy_id"`
	SegmentID   PatchableUint   `json:"segment_id"`
	DivisionID  PatchableUint   `json:"division_id"`
	OwnerID     PatchableUint   `json:"owner_id"`
	Notes       PatchableString `json:"notes"`
}

type StrategyEmbed struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type SegmentEmbed struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type DivisionEmbed struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Code  string `json:"code"`
	Color string `json:"color"`
}

type OwnerEmbed struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type ObjectiveResponse struct {
	ID          uint           `json:"id"`
	PeriodID    uint           `json:"period_id"`
	Title       string         `json:"title"`
	Description *string        `json:"description"`
	Progress    float64        `json:"progress"`
	Status      string         `json:"status"`
	SortOrder   int            `json:"sort_order"`
	CreatedBy   uint           `json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	StrategyID  *uint          `json:"strategy_id"`
	SegmentID   *uint          `json:"segment_id"`
	DivisionID  *uint          `json:"division_id"`
	OwnerID     *uint          `json:"owner_id"`
	Notes       *string        `json:"notes"`
	Strategy    *StrategyEmbed `json:"strategy"`
	Segment     *SegmentEmbed  `json:"segment"`
	Division    *DivisionEmbed `json:"division"`
	Owner       *OwnerEmbed    `json:"owner"`
}

func ToObjectiveResponse(o *Objective) ObjectiveResponse {
	resp := ObjectiveResponse{
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
		StrategyID:  o.StrategyID,
		SegmentID:   o.SegmentID,
		DivisionID:  o.DivisionID,
		OwnerID:     o.OwnerID,
		Notes:       o.Notes,
	}
	if o.Strategy != nil && o.Strategy.ID != 0 {
		resp.Strategy = &StrategyEmbed{ID: o.Strategy.ID, Name: o.Strategy.Name, Color: o.Strategy.Color}
	}
	if o.Segment != nil && o.Segment.ID != 0 {
		resp.Segment = &SegmentEmbed{ID: o.Segment.ID, Name: o.Segment.Name, Color: o.Segment.Color}
	}
	if o.Division != nil && o.Division.ID != 0 {
		resp.Division = &DivisionEmbed{ID: o.Division.ID, Name: o.Division.Name, Code: o.Division.Code, Color: o.Division.Color}
	}
	if o.Owner != nil && o.Owner.ID != 0 {
		resp.Owner = &OwnerEmbed{ID: o.Owner.ID, Name: o.Owner.Name, Email: o.Owner.Email}
	}
	return resp
}

func ToObjectiveResponses(objectives []Objective) []ObjectiveResponse {
	responses := make([]ObjectiveResponse, len(objectives))
	for i, o := range objectives {
		responses[i] = ToObjectiveResponse(&o)
	}
	return responses
}
