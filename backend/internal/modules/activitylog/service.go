package activitylog

import (
	"encoding/json"
	"fmt"

	"github.com/antares-eazy/okr-backend/internal/ws"
)

type Service struct {
	repo *Repository
	hub  *ws.Hub
}

func NewService(repo *Repository, hub *ws.Hub) *Service {
	return &Service{repo: repo, hub: hub}
}

func (s *Service) Log(userID uint, action, entityType string, entityID uint, entityTitle string, opts ...LogOption) {
	log := &ActivityLog{
		UserID:      userID,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		EntityTitle: entityTitle,
	}

	for _, opt := range opts {
		opt(log)
	}


	if log.Description == "" {
		log.Description = generateDescription(action, entityType, entityTitle)
	}

	_ = s.repo.Create(log)


	if s.hub != nil {
		msg, _ := json.Marshal(map[string]interface{}{
			"type":         "activity",
			"action":       action,
			"entity_type":  entityType,
			"entity_id":    entityID,
			"entity_title": entityTitle,
			"user_id":      userID,
			"description":  log.Description,
		})
		s.hub.Broadcast(msg)
	}
}

type LogOption func(*ActivityLog)

func WithDescription(desc string) LogOption {
	return func(l *ActivityLog) { l.Description = desc }
}

func WithOldValue(v string) LogOption {
	return func(l *ActivityLog) { l.OldValue = &v }
}

func WithNewValue(v string) LogOption {
	return func(l *ActivityLog) { l.NewValue = &v }
}

func WithObjectiveID(id uint) LogOption {
	return func(l *ActivityLog) { l.ObjectiveID = &id }
}

func WithKeyResultID(id uint) LogOption {
	return func(l *ActivityLog) { l.KeyResultID = &id }
}

func WithInitiativeID(id uint) LogOption {
	return func(l *ActivityLog) { l.InitiativeID = &id }
}

func generateDescription(action, entityType, title string) string {
	entityLabel := map[string]string{
		EntityObjective:  "objective",
		EntityKeyResult:  "key result",
		EntityInitiative: "initiative",
		EntitySprint:     "sprint",
	}[entityType]

	actionLabel := map[string]string{
		ActionCreate:         "membuat",
		ActionUpdate:         "memperbarui",
		ActionDelete:         "menghapus",
		ActionProgressUpdate: "mengubah progress",
		ActionStatusChange:   "mengubah status",
		ActionAssign:         "meng-assign",
		ActionActivate:       "mengaktifkan",
		ActionComplete:       "menyelesaikan",
	}[action]

	return fmt.Sprintf("%s %s \"%s\"", actionLabel, entityLabel, title)
}
