package segment

import (
	"time"

	"gorm.io/gorm"
)

// Segment represents a customer segment (e.g. "SME", "Enterprise", "Government", "B2B ICT").
type Segment struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description *string        `gorm:"size:500" json:"description"`
	Color       string         `gorm:"size:7;not null;default:'#E5E7EB'" json:"color"`
	IsActive    bool           `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Segment) TableName() string {
	return "segments"
}
