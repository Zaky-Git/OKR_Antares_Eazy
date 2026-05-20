package division

import (
	"time"

	"gorm.io/gorm"
)

// Division represents an organizational unit (e.g. "Product", "Developer", "GTM", "UX", "Operational", "Data").
type Division struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Code        string         `gorm:"size:20;not null" json:"code"`
	Description *string        `gorm:"size:500" json:"description"`
	Color       string         `gorm:"size:7;not null;default:'#E5E7EB'" json:"color"`
	IsActive    bool           `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Division) TableName() string {
	return "divisions"
}
