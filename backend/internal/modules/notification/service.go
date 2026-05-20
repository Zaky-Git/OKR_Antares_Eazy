package notification

import (
	"fmt"
	"time"

	"github.com/antares-eazy/okr-backend/internal/modules/initiative"
)

type Service struct {
	repo           *Repository
	initiativeRepo *initiative.Repository
}

func NewService(repo *Repository, initiativeRepo *initiative.Repository) *Service {
	return &Service{repo: repo, initiativeRepo: initiativeRepo}
}

func (s *Service) GetNotifications(userID uint, page, limit int) ([]NotificationResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	notifications, total, err := s.repo.FindByUserID(userID, page, limit)
	if err != nil {
		return nil, 0, err
	}
	return ToNotificationResponses(notifications), total, nil
}

func (s *Service) GetUnreadCount(userID uint) (int64, error) {
	return s.repo.CountUnread(userID)
}

func (s *Service) MarkRead(id uint, userID uint) error {
	return s.repo.MarkRead(id, userID)
}

func (s *Service) MarkAllRead(userID uint) error {
	return s.repo.MarkAllRead(userID)
}

func (s *Service) CheckDueInitiatives() (int, error) {
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	in1Day := today.AddDate(0, 0, 1)
	in3Days := today.AddDate(0, 0, 3)


	var initiatives []initiative.Initiative
	err := s.repo.GetDB().
		Where("assignee_id IS NOT NULL AND due_date IS NOT NULL AND status NOT IN (?, ?)", "DONE", "CANCELLED").
		Find(&initiatives).Error
	if err != nil {
		return 0, err
	}

	created := 0

	for _, init := range initiatives {
		if init.AssigneeID == nil || init.DueDate == nil {
			continue
		}

		dueDate := time.Date(init.DueDate.Year(), init.DueDate.Month(), init.DueDate.Day(), 0, 0, 0, 0, time.UTC)
		userID := *init.AssigneeID

		var reminderKey string
		var title string
		var message string

		switch {
		case dueDate.Before(today):
			reminderKey = "OVERDUE"
			title = "Initiative Overdue"
			message = fmt.Sprintf("Initiative \"%s\" is overdue", init.Title)
		case dueDate.Equal(today):
			reminderKey = "DUE_TODAY"
			title = "Initiative Due Today"
			message = fmt.Sprintf("Initiative \"%s\" is due today", init.Title)
		case dueDate.Equal(in1Day):
			reminderKey = "DUE_H1"
			title = "Initiative Due Tomorrow"
			message = fmt.Sprintf("Initiative \"%s\" is due tomorrow", init.Title)
		case dueDate.Equal(in3Days):
			reminderKey = "DUE_H3"
			title = "Initiative Due in 3 Days"
			message = fmt.Sprintf("Initiative \"%s\" is due in 3 days", init.Title)
		default:
			continue
		}


		exists, _ := s.repo.LogExists(init.ID, userID, reminderKey)
		if exists {
			continue
		}


		notification := &Notification{
			UserID:     userID,
			Type:       reminderKey,
			Title:      title,
			Message:    message,
			EntityType: "initiative",
			EntityID:   init.ID,
			IsRead:     false,
			CreatedAt:  now,
		}
		if err := s.repo.Create(notification); err != nil {
			continue
		}


		log := &NotificationLog{
			InitiativeID:     init.ID,
			UserID:           userID,
			NotificationType: reminderKey,
			ReminderKey:      reminderKey,
			CreatedAt:        now,
		}
		s.repo.CreateLog(log)
		created++
	}

	return created, nil
}
