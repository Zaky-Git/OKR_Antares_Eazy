package dashboard

import (
	"time"

	"gorm.io/gorm"

	"github.com/antares-eazy/okr-backend/internal/modules/initiative"
	"github.com/antares-eazy/okr-backend/internal/modules/objective"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) GetDashboard(periodID uint) (*DashboardResponse, error) {
	var totalObjectives int64
	s.db.Model(&objective.Objective{}).Where("period_id = ?", periodID).Count(&totalObjectives)

	var avgProgress float64
	s.db.Model(&objective.Objective{}).Where("period_id = ?", periodID).Select("COALESCE(AVG(progress), 0)").Scan(&avgProgress)

	var onTrack int64
	s.db.Model(&objective.Objective{}).Where("period_id = ? AND status = ?", periodID, "ON_TRACK").Count(&onTrack)

	var atRisk int64
	s.db.Model(&objective.Objective{}).Where("period_id = ? AND status = ?", periodID, "AT_RISK").Count(&atRisk)

	var offTrack int64
	s.db.Model(&objective.Objective{}).Where("period_id = ? AND status = ?", periodID, "OFF_TRACK").Count(&offTrack)

	today := time.Now().UTC().Format("2006-01-02")
	var overdueInitiatives int64
	s.db.Model(&initiative.Initiative{}).
		Where("due_date < ? AND status NOT IN (?, ?)", today, "DONE", "CANCELLED").
		Joins("JOIN key_results ON key_results.id = initiatives.key_result_id AND key_results.deleted_at IS NULL").
		Joins("JOIN objectives ON objectives.id = key_results.objective_id AND objectives.deleted_at IS NULL AND objectives.period_id = ?", periodID).
		Count(&overdueInitiatives)

	var recentUpdates []initiative.InitiativeUpdate
	s.db.Order("created_at DESC").Limit(10).Find(&recentUpdates)

	return &DashboardResponse{
		TotalObjectives:    totalObjectives,
		AvgProgress:        avgProgress,
		OnTrack:            onTrack,
		AtRisk:             atRisk,
		OffTrack:           offTrack,
		OverdueInitiatives: overdueInitiatives,
		RecentUpdates:      recentUpdates,
	}, nil
}

func (s *Service) GetAnnualDashboard(year int) (*AnnualDashboardResponse, error) {

	type PeriodInfo struct {
		ID      uint
		Quarter string
	}
	var periods []PeriodInfo
	s.db.Table("periods").Where("year = ? AND deleted_at IS NULL", year).Select("id, quarter").Find(&periods)

	var quarterSummaries []QuarterSummary
	var annualTotalObj int64
	var annualTotalProgress float64
	var annualCompleted int64
	var annualTotalInitiatives int64
	var annualTotalOverdue int64
	validQuarters := 0

	today := time.Now().UTC().Format("2006-01-02")

	for _, p := range periods {
		var totalObj int64
		s.db.Model(&objective.Objective{}).Where("period_id = ?", p.ID).Count(&totalObj)

		var avgProgress float64
		s.db.Model(&objective.Objective{}).Where("period_id = ?", p.ID).Select("COALESCE(AVG(progress), 0)").Scan(&avgProgress)

		var onTrack, atRisk, offTrack, done int64
		s.db.Model(&objective.Objective{}).Where("period_id = ? AND status = ?", p.ID, "ON_TRACK").Count(&onTrack)
		s.db.Model(&objective.Objective{}).Where("period_id = ? AND status = ?", p.ID, "AT_RISK").Count(&atRisk)
		s.db.Model(&objective.Objective{}).Where("period_id = ? AND status = ?", p.ID, "OFF_TRACK").Count(&offTrack)
		s.db.Model(&objective.Objective{}).Where("period_id = ? AND status = ?", p.ID, "DONE").Count(&done)

		var overdueInit int64
		s.db.Model(&initiative.Initiative{}).
			Where("due_date < ? AND status NOT IN (?, ?)", today, "DONE", "CANCELLED").
			Joins("JOIN key_results ON key_results.id = initiatives.key_result_id AND key_results.deleted_at IS NULL").
			Joins("JOIN objectives ON objectives.id = key_results.objective_id AND objectives.deleted_at IS NULL AND objectives.period_id = ?", p.ID).
			Count(&overdueInit)

		quarterSummaries = append(quarterSummaries, QuarterSummary{
			Quarter:     p.Quarter,
			PeriodID:    p.ID,
			TotalObj:    totalObj,
			AvgProgress: avgProgress,
			OnTrack:     onTrack,
			AtRisk:      atRisk,
			OffTrack:    offTrack,
			Done:        done,
		})

		annualTotalObj += totalObj
		annualTotalProgress += avgProgress
		annualCompleted += done
		annualTotalOverdue += overdueInit
		if totalObj > 0 {
			validQuarters++
		}
	}


	for _, p := range periods {
		var count int64
		s.db.Model(&initiative.Initiative{}).
			Joins("JOIN key_results ON key_results.id = initiatives.key_result_id AND key_results.deleted_at IS NULL").
			Joins("JOIN objectives ON objectives.id = key_results.objective_id AND objectives.deleted_at IS NULL AND objectives.period_id = ?", p.ID).
			Count(&count)
		annualTotalInitiatives += count
	}

	avgProgressAnnual := 0.0
	completionRate := 0.0
	if validQuarters > 0 {
		avgProgressAnnual = annualTotalProgress / float64(validQuarters)
	}
	if annualTotalObj > 0 {
		completionRate = float64(annualCompleted) / float64(annualTotalObj) * 100
	}

	return &AnnualDashboardResponse{
		Year: year,
		AnnualSummary: AnnualSummary{
			TotalObjectives:     annualTotalObj,
			AvgProgress:         avgProgressAnnual,
			CompletedObjectives: annualCompleted,
			CompletionRate:      completionRate,
			TotalInitiatives:    annualTotalInitiatives,
			TotalOverdue:        annualTotalOverdue,
		},
		Quarters: quarterSummaries,
	}, nil
}

func (s *Service) GetActivities(page, limit int) ([]ActivityItem, int64, error) {
	var total int64
	s.db.Table("activity_logs").Count(&total)

	var results []struct {
		ID           uint    `json:"id"`
		UserID       uint    `json:"user_id"`
		Action       string  `json:"action"`
		EntityType   string  `json:"entity_type"`
		EntityID     uint    `json:"entity_id"`
		EntityTitle  string  `json:"entity_title"`
		Description  string  `json:"description"`
		OldValue     *string `json:"old_value"`
		NewValue     *string `json:"new_value"`
		ObjectiveID  *uint   `json:"objective_id"`
		KeyResultID  *uint   `json:"key_result_id"`
		InitiativeID *uint   `json:"initiative_id"`
		CreatedAt    string  `json:"created_at"`
		UserName     string  `json:"user_name"`
	}

	offset := (page - 1) * limit
	err := s.db.Table("activity_logs").
		Select(`activity_logs.*, users.name as user_name`).
		Joins("LEFT JOIN users ON users.id = activity_logs.user_id").
		Order("activity_logs.created_at DESC").
		Offset(offset).Limit(limit).
		Find(&results).Error

	if err != nil {
		return nil, 0, err
	}

	var activities []ActivityItem
	for _, r := range results {
		activities = append(activities, ActivityItem{
			ID:           r.ID,
			UserID:       r.UserID,
			UserName:     r.UserName,
			Action:       r.Action,
			EntityType:   r.EntityType,
			EntityID:     r.EntityID,
			EntityTitle:  r.EntityTitle,
			Description:  r.Description,
			OldValue:     r.OldValue,
			NewValue:     r.NewValue,
			ObjectiveID:  r.ObjectiveID,
			KeyResultID:  r.KeyResultID,
			InitiativeID: r.InitiativeID,
			CreatedAt:    r.CreatedAt,
		})
	}

	return activities, total, nil
}
