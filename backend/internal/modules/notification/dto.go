package notification

import "time"

type NotificationResponse struct {
	ID         uint       `json:"id"`
	UserID     uint       `json:"user_id"`
	Type       string     `json:"type"`
	Title      string     `json:"title"`
	Message    string     `json:"message"`
	EntityType string     `json:"entity_type"`
	EntityID   uint       `json:"entity_id"`
	IsRead     bool       `json:"is_read"`
	CreatedAt  time.Time  `json:"created_at"`
	ReadAt     *time.Time `json:"read_at"`
}

type UnreadCountResponse struct {
	Count int64 `json:"count"`
}

func ToNotificationResponse(n *Notification) NotificationResponse {
	return NotificationResponse{
		ID:         n.ID,
		UserID:     n.UserID,
		Type:       n.Type,
		Title:      n.Title,
		Message:    n.Message,
		EntityType: n.EntityType,
		EntityID:   n.EntityID,
		IsRead:     n.IsRead,
		CreatedAt:  n.CreatedAt,
		ReadAt:     n.ReadAt,
	}
}

func ToNotificationResponses(notifications []Notification) []NotificationResponse {
	responses := make([]NotificationResponse, len(notifications))
	for i, n := range notifications {
		responses[i] = ToNotificationResponse(&n)
	}
	return responses
}
