package period

import (
	"time"

	"gorm.io/gorm"
)

type Period struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Year      int            `gorm:"not null" json:"year"`
	Quarter   string         `gorm:"type:enum('Q1','Q2','Q3','Q4');not null" json:"quarter"`
	StartDate time.Time      `gorm:"type:date;not null" json:"start_date"`
	EndDate   time.Time      `gorm:"type:date;not null" json:"end_date"`
	IsCurrent bool           `gorm:"default:false" json:"is_current"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Period) TableName() string {
	return "periods"
}
