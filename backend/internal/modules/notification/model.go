package notification

import "time"

type Notification struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	UserID     uint       `gorm:"not null" json:"user_id"`
	Type       string     `gorm:"size:50;not null" json:"type"`
	Title      string     `gorm:"size:255;not null" json:"title"`
	Message    string     `gorm:"type:text;not null" json:"message"`
	EntityType string     `gorm:"size:50;not null" json:"entity_type"`
	EntityID   uint       `gorm:"not null" json:"entity_id"`
	IsRead     bool       `gorm:"default:false" json:"is_read"`
	CreatedAt  time.Time  `json:"created_at"`
	ReadAt     *time.Time `json:"read_at"`
}

func (Notification) TableName() string {
	return "notifications"
}

type NotificationLog struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	InitiativeID     uint      `gorm:"not null" json:"initiative_id"`
	UserID           uint      `gorm:"not null" json:"user_id"`
	NotificationType string    `gorm:"size:50;not null" json:"notification_type"`
	ReminderKey      string    `gorm:"size:50;not null" json:"reminder_key"`
	CreatedAt        time.Time `json:"created_at"`
}

func (NotificationLog) TableName() string {
	return "notification_logs"
}
