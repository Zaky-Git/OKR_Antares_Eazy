package sprint

import (
	"time"

	"gorm.io/gorm"
)

type Sprint struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	PeriodID   uint           `gorm:"not null;index" json:"period_id"`
	Name       string         `gorm:"size:100;not null" json:"name"`
	Goal       *string        `gorm:"type:text" json:"goal"`
	StartDate  time.Time      `gorm:"type:date;not null" json:"start_date"`
	EndDate    time.Time      `gorm:"type:date;not null" json:"end_date"`
	Status     string         `gorm:"size:30;default:PLANNING" json:"status"`
	ReviewNote *string        `gorm:"type:text" json:"review_note"`
	RetroNote  *string        `gorm:"type:text" json:"retro_note"`
	CreatedBy  uint           `gorm:"not null" json:"created_by"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Sprint) TableName() string {
	return "sprints"
}
