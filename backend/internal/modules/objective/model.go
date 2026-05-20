package objective

import (
	"time"

	"gorm.io/gorm"
)

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
}

func (Objective) TableName() string {
	return "objectives"
}
