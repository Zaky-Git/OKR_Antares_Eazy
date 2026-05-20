package sprint

import (
	"errors"
	"fmt"
	"time"

	"github.com/antares-eazy/okr-backend/internal/modules/activitylog"
	"github.com/antares-eazy/okr-backend/internal/modules/period"
)

type Service struct {
	repo       *Repository
	periodRepo *period.Repository
	actLogger  *activitylog.Service
}

func NewService(repo *Repository, periodRepo *period.Repository, actLogger *activitylog.Service) *Service {
	return &Service{repo: repo, periodRepo: periodRepo, actLogger: actLogger}
}

func (s *Service) Create(req CreateRequest, userID uint) (*SprintResponse, error) {

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date format, use YYYY-MM-DD")
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end_date format, use YYYY-MM-DD")
	}

	if !startDate.Before(endDate) {
		return nil, errors.New("start_date must be before end_date")
	}


	p, err := s.periodRepo.FindByID(req.PeriodID)
	if err != nil {
		return nil, errors.New("period not found")
	}

	if startDate.Before(p.StartDate) || endDate.After(p.EndDate) {
		return nil, errors.New("sprint dates must be within quarter range")
	}

	var goal *string
	if req.Goal != "" {
		goal = &req.Goal
	}

	sprint := &Sprint{
		PeriodID:  req.PeriodID,
		Name:      req.Name,
		Goal:      goal,
		StartDate: startDate,
		EndDate:   endDate,
		Status:    "PLANNING",
		CreatedBy: userID,
	}

	if err := s.repo.Create(sprint); err != nil {
		return nil, err
	}

	resp := ToSprintResponse(sprint)
	return &resp, nil
}

func (s *Service) GetByID(id uint) (*SprintResponse, error) {
	sprint, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("sprint not found")
	}
	resp := ToSprintResponse(sprint)
	return &resp, nil
}

func (s *Service) GetByPeriod(periodID uint) ([]SprintResponse, error) {
	sprints, err := s.repo.FindByPeriodID(periodID)
	if err != nil {
		return nil, err
	}
	return ToSprintResponses(sprints), nil
}

func (s *Service) Update(id uint, req UpdateRequest, userID uint) (*SprintResponse, error) {
	sprint, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("sprint not found")
	}

	if sprint.Status == "COMPLETED" {
		return nil, errors.New("cannot update a completed sprint")
	}

	if req.Name != nil {
		sprint.Name = *req.Name
	}
	if req.Goal != nil {
		sprint.Goal = req.Goal
	}
	if req.StartDate != nil {
		startDate, err := time.Parse("2006-01-02", *req.StartDate)
		if err != nil {
			return nil, errors.New("invalid start_date format")
		}
		sprint.StartDate = startDate
	}
	if req.EndDate != nil {
		endDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date format")
		}
		sprint.EndDate = endDate
	}


	p, _ := s.periodRepo.FindByID(sprint.PeriodID)
	if p != nil {
		if sprint.StartDate.Before(p.StartDate) || sprint.EndDate.After(p.EndDate) {
			return nil, errors.New("sprint dates must be within quarter range")
		}
	}

	if !sprint.StartDate.Before(sprint.EndDate) {
		return nil, errors.New("start_date must be before end_date")
	}

	if err := s.repo.Update(sprint); err != nil {
		return nil, err
	}

	resp := ToSprintResponse(sprint)
	return &resp, nil
}

func (s *Service) Activate(id uint) (*SprintResponse, error) {
	sprint, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("sprint not found")
	}

	if sprint.Status != "PLANNING" {
		return nil, errors.New("only PLANNING sprints can be activated")
	}


	existing, _ := s.repo.FindActiveByPeriodID(sprint.PeriodID)
	if existing != nil {
		return nil, errors.New("another sprint is already ACTIVE in this quarter")
	}

	sprint.Status = "ACTIVE"
	if err := s.repo.Update(sprint); err != nil {
		return nil, err
	}

	resp := ToSprintResponse(sprint)
	return &resp, nil
}

func (s *Service) Complete(id uint, req CompleteRequest) (*SprintResponse, error) {
	sprint, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("sprint not found")
	}

	if sprint.Status != "ACTIVE" {
		return nil, errors.New("only ACTIVE sprints can be completed")
	}

	sprint.Status = "COMPLETED"
	sprint.ReviewNote = req.ReviewNote
	sprint.RetroNote = req.RetroNote

	if err := s.repo.Update(sprint); err != nil {
		return nil, err
	}

	resp := ToSprintResponse(sprint)
	return &resp, nil
}

func (s *Service) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("sprint not found")
	}
	return s.repo.SoftDelete(id)
}

// CarryOverInitiatives moves selected initiatives to the next PLANNING sprint in the same period
func (s *Service) CarryOverInitiatives(sprintID uint, initiativeIDs []uint, userID uint) (*CarryOverResponse, error) {
	// 1. Find the current sprint to get its period_id
	sprint, err := s.repo.FindByID(sprintID)
	if err != nil {
		return nil, errors.New("sprint not found")
	}

	// 2. Find next PLANNING sprint in the same period
	targetSprint, err := s.repo.FindNextPlanningSprintInPeriod(sprint.PeriodID, sprintID)
	if err != nil {
		return nil, errors.New("no target sprint available for carry-over in this quarter")
	}

	// 3. Update each initiative's sprint_id and log activity
	carriedCount := 0
	for _, initID := range initiativeIDs {
		if err := s.repo.UpdateInitiativeSprintID(initID, targetSprint.ID); err != nil {
			continue
		}
		carriedCount++

		// Log activity for each carried initiative
		title, _ := s.repo.GetInitiativeTitle(initID)
		s.actLogger.Log(
			userID,
			activitylog.ActionAssign,
			activitylog.EntityInitiative,
			initID,
			title,
			activitylog.WithDescription(fmt.Sprintf("carry-over initiative \"%s\" to sprint \"%s\"", title, targetSprint.Name)),
			activitylog.WithInitiativeID(initID),
		)
	}

	return &CarryOverResponse{
		CarriedCount:     carriedCount,
		TargetSprintID:   targetSprint.ID,
		TargetSprintName: targetSprint.Name,
	}, nil
}

func (s *Service) GetSprintInitiatives(sprintID uint) ([]SprintInitiativeResponse, error) {
	rows, err := s.repo.GetSprintInitiatives(sprintID)
	if err != nil {
		return nil, err
	}

	responses := make([]SprintInitiativeResponse, len(rows))
	for i, row := range rows {
		responses[i] = SprintInitiativeResponse{
			ID:             row.ID,
			KeyResultID:    row.KeyResultID,
			SprintID:       row.SprintID,
			ParentID:       row.ParentID,
			Title:          row.Title,
			Description:    row.Description,
			AssigneeID:     row.AssigneeID,
			AssigneeName:   row.AssigneeName,
			Progress:       row.Progress,
			Status:         row.Status,
			DueDate:        row.DueDate,
			ObjectiveTitle: row.ObjectiveTitle,
			KeyResultTitle: row.KeyResultTitle,
			CreatedBy:      row.CreatedBy,
		}
	}
	return responses, nil
}

func (s *Service) GetSprintSummary(sprintID uint) (*SprintSummaryResponse, error) {
	row, err := s.repo.GetSprintSummary(sprintID)
	if err != nil {
		return nil, err
	}

	return &SprintSummaryResponse{
		TotalInitiatives: row.TotalInitiatives,
		TodoCount:        row.TodoCount,
		InProgressCount:  row.InProgressCount,
		BlockedCount:     row.BlockedCount,
		DoneCount:        row.DoneCount,
		CancelledCount:   row.CancelledCount,
		SprintProgress:   row.SprintProgress,
	}, nil
}

func (s *Service) GetSprintBacklog(sprintID uint) ([]SprintInitiativeResponse, error) {
	sprint, err := s.repo.FindByID(sprintID)
	if err != nil {
		return nil, errors.New("sprint not found")
	}

	rows, err := s.repo.GetBacklogInitiatives(sprint.PeriodID)
	if err != nil {
		return nil, err
	}

	responses := make([]SprintInitiativeResponse, len(rows))
	for i, row := range rows {
		responses[i] = SprintInitiativeResponse{
			ID:             row.ID,
			KeyResultID:    row.KeyResultID,
			SprintID:       row.SprintID,
			ParentID:       row.ParentID,
			Title:          row.Title,
			Description:    row.Description,
			AssigneeID:     row.AssigneeID,
			AssigneeName:   row.AssigneeName,
			Progress:       row.Progress,
			Status:         row.Status,
			DueDate:        row.DueDate,
			ObjectiveTitle: row.ObjectiveTitle,
			KeyResultTitle: row.KeyResultTitle,
			CreatedBy:      row.CreatedBy,
		}
	}
	return responses, nil
}
