package activitylog

import "time"

const (
	ActionCreate         = "CREATE"
	ActionUpdate         = "UPDATE"
	ActionDelete         = "DELETE"
	ActionProgressUpdate = "PROGRESS_UPDATE"
	ActionStatusChange   = "STATUS_CHANGE"
	ActionAssign         = "ASSIGN"
	ActionActivate       = "ACTIVATE"
	ActionComplete       = "COMPLETE"
)

const (
	EntityObjective  = "OBJECTIVE"
	EntityKeyResult  = "KEY_RESULT"
	EntityInitiative = "INITIATIVE"
	EntitySprint     = "SPRINT"
)

type ActivityLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"not null;index" json:"user_id"`
	Action       string    `gorm:"size:50;not null" json:"action"`
	EntityType   string    `gorm:"size:50;not null" json:"entity_type"`
	EntityID     uint      `gorm:"not null" json:"entity_id"`
	EntityTitle  string    `gorm:"size:255" json:"entity_title"`
	Description  string    `gorm:"type:text" json:"description"`
	OldValue     *string   `gorm:"type:text" json:"old_value"`
	NewValue     *string   `gorm:"type:text" json:"new_value"`
	ObjectiveID  *uint     `gorm:"index" json:"objective_id"`
	KeyResultID  *uint     `gorm:"index" json:"key_result_id"`
	InitiativeID *uint     `gorm:"index" json:"initiative_id"`
	CreatedAt    time.Time `json:"created_at"`
}

func (ActivityLog) TableName() string {
	return "activity_logs"
}
