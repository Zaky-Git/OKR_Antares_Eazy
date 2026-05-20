package strategy

import (
	"time"

	"gorm.io/gorm"
)

// Strategy represents a strategic pillar (e.g. "Defend to Scale", "Extend", "Transform").
type Strategy struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description *string        `gorm:"size:500" json:"description"`
	Color       string         `gorm:"size:7;not null;default:'#E5E7EB'" json:"color"`
	SortOrder   int            `gorm:"default:0;index:idx_strategies_sort_name,priority:1" json:"sort_order"`
	IsActive    bool           `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Strategy) TableName() string {
	return "strategies"
}
