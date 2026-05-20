package objective

import (
	"time"

	"gorm.io/gorm"
)

// EmbeddedStrategy is a lightweight read-only representation of strategy used for preload.
// Defining it locally avoids import cycle.
type EmbeddedStrategy struct {
	ID    uint   `gorm:"primaryKey" json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

func (EmbeddedStrategy) TableName() string { return "strategies" }

type EmbeddedSegment struct {
	ID    uint   `gorm:"primaryKey" json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

func (EmbeddedSegment) TableName() string { return "segments" }

type EmbeddedDivision struct {
	ID    uint   `gorm:"primaryKey" json:"id"`
	Name  string `json:"name"`
	Code  string `json:"code"`
	Color string `json:"color"`
}

func (EmbeddedDivision) TableName() string { return "divisions" }

type EmbeddedOwner struct {
	ID    uint   `gorm:"primaryKey" json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (EmbeddedOwner) TableName() string { return "users" }

type Objective struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	PeriodID    uint           `gorm:"not null" json:"period_id"`
	Title       string         `gorm:"size:255;not null" json:"title"`
	Description *string        `gorm:"type:text" json:"description"`
	Progress    float64        `gorm:"type:decimal(5,2);default:0" json:"progress"`
	Status      string         `gorm:"size:30;default:PLANNING" json:"status"`
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	CreatedBy   uint           `gorm:"not null" json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Context fields (Phase 1: okr-objective-context)
	StrategyID *uint   `gorm:"index" json:"strategy_id"`
	SegmentID  *uint   `gorm:"index" json:"segment_id"`
	DivisionID *uint   `gorm:"index" json:"division_id"`
	OwnerID    *uint   `gorm:"index" json:"owner_id"`
	Notes      *string `gorm:"type:text" json:"notes"`

	// Preloaded embedded relations (used for response only).
	Strategy *EmbeddedStrategy `gorm:"foreignKey:StrategyID" json:"-"`
	Segment  *EmbeddedSegment  `gorm:"foreignKey:SegmentID" json:"-"`
	Division *EmbeddedDivision `gorm:"foreignKey:DivisionID" json:"-"`
	Owner    *EmbeddedOwner    `gorm:"foreignKey:OwnerID" json:"-"`
}

func (Objective) TableName() string {
	return "objectives"
}
