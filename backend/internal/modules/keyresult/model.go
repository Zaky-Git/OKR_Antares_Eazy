package keyresult

import (
	"time"

	"gorm.io/gorm"
)

const (
	KRTypeMetric    = "METRIC"
	KRTypeMilestone = "MILESTONE"
)

type KeyResult struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	ObjectiveID   uint           `gorm:"not null" json:"objective_id"`
	Title         string         `gorm:"size:255;not null" json:"title"`
	Description   *string        `gorm:"type:text" json:"description"`
	KRType        string         `gorm:"size:20;default:METRIC" json:"kr_type"`
	TargetValue   float64        `gorm:"type:decimal(10,2);not null;default:100" json:"target_value"`
	CurrentValue  float64        `gorm:"type:decimal(10,2);not null;default:0" json:"current_value"`
	BaselineValue *float64       `gorm:"type:decimal(10,2)" json:"baseline_value"`
	MetricUnit    *string        `gorm:"size:50" json:"metric_unit"`
	DueDate       *string        `gorm:"type:date" json:"due_date"`
	Notes         *string        `gorm:"type:text" json:"notes"`
	Progress      float64        `gorm:"type:decimal(5,2);default:0" json:"progress"`
	Status        string         `gorm:"size:30;default:PLANNING" json:"status"`
	CreatedBy     uint           `gorm:"not null" json:"created_by"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (KeyResult) TableName() string {
	return "key_results"
}

// EffectiveType returns the KR type, defaulting to METRIC for legacy/empty records.
func (k *KeyResult) EffectiveType() string {
	if k.KRType == "" {
		return KRTypeMetric
	}
	return k.KRType
}
