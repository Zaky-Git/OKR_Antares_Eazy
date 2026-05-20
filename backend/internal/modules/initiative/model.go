package initiative

import (
	"time"

	"gorm.io/gorm"
)

type Initiative struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	KeyResultID uint           `gorm:"not null;index" json:"key_result_id"`
	SprintID    *uint          `gorm:"index" json:"sprint_id"`
	ParentID    *uint          `gorm:"index" json:"parent_id"`
	Title       string         `gorm:"size:255;not null" json:"title"`
	Description *string        `gorm:"type:text" json:"description"`
	AssigneeID  *uint          `gorm:"index" json:"assignee_id"`
	Progress    float64        `gorm:"type:decimal(5,2);default:0" json:"progress"`
	Status      string         `gorm:"size:30;default:TODO" json:"status"`
	DueDate     *time.Time     `gorm:"type:date" json:"due_date"`
	CreatedBy   uint           `gorm:"not null" json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Children    []Initiative   `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

func (Initiative) TableName() string {
	return "initiatives"
}

type InitiativeUpdate struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	InitiativeID   uint      `gorm:"not null" json:"initiative_id"`
	UserID         uint      `gorm:"not null" json:"user_id"`
	ProgressBefore float64   `gorm:"type:decimal(5,2)" json:"progress_before"`
	ProgressAfter  float64   `gorm:"type:decimal(5,2)" json:"progress_after"`
	Note           *string   `gorm:"type:text" json:"note"`
	Blocker        *string   `gorm:"type:text" json:"blocker"`
	CreatedAt      time.Time `json:"created_at"`
}

func (InitiativeUpdate) TableName() string {
	return "initiative_updates"
}
