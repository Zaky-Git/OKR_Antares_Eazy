package keyresult

import (
	"errors"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(objectiveID uint, req CreateRequest, userID uint) (*KeyResultResponse, error) {
	var description *string
	if req.Description != "" {
		description = &req.Description
	}
	var metricUnit *string
	if req.MetricUnit != "" {
		metricUnit = &req.MetricUnit
	}

	progress := 0.0
	if req.TargetValue > 0 && req.CurrentValue > 0 {
		progress = (req.CurrentValue / req.TargetValue) * 100
		if progress > 100 { progress = 100 }
	}

	kr := &KeyResult{
		ObjectiveID:  objectiveID,
		Title:        req.Title,
		Description:  description,
		TargetValue:  req.TargetValue,
		CurrentValue: req.CurrentValue,
		MetricUnit:   metricUnit,
		Progress:     progress,
		Status:       "PLANNING",
		CreatedBy:    userID,
	}

	if err := s.repo.Create(kr); err != nil {
		return nil, err
	}

	resp := ToKeyResultResponse(kr)
	return &resp, nil
}

func (s *Service) Update(id uint, req UpdateRequest, userID uint) (*KeyResultResponse, error) {
	kr, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("key result not found")
	}

	if kr.CreatedBy != userID {
		return nil, errors.New("forbidden")
	}

	if req.Title != nil {
		kr.Title = *req.Title
	}
	if req.Description != nil {
		kr.Description = req.Description
	}
	if req.TargetValue != nil {
		kr.TargetValue = *req.TargetValue
	}
	if req.CurrentValue != nil {
		kr.CurrentValue = *req.CurrentValue
	}
	if req.MetricUnit != nil {
		kr.MetricUnit = req.MetricUnit
	}
	if req.Status != nil {
		kr.Status = *req.Status
	}


	if kr.TargetValue > 0 {
		kr.Progress = (kr.CurrentValue / kr.TargetValue) * 100
		if kr.Progress > 100 {
			kr.Progress = 100
		}
	}

	if err := s.repo.Update(kr); err != nil {
		return nil, err
	}

	resp := ToKeyResultResponse(kr)
	return &resp, nil
}

func (s *Service) Delete(id uint, userID uint) error {
	kr, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("key result not found")
	}

	if kr.CreatedBy != userID {
		return errors.New("forbidden")
	}

	return s.repo.SoftDelete(id)
}

func (s *Service) GetByObjectiveID(objectiveID uint) ([]KeyResultResponse, error) {
	krs, err := s.repo.FindByObjectiveID(objectiveID)
	if err != nil {
		return nil, err
	}
	return ToKeyResultResponses(krs), nil
}
