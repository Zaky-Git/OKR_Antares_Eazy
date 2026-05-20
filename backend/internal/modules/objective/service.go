package objective

import (
	"errors"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(req CreateRequest, userID uint) (*ObjectiveResponse, error) {
	var description *string
	if req.Description != "" {
		description = &req.Description
	}

	obj := &Objective{
		PeriodID:    req.PeriodID,
		Title:       req.Title,
		Description: description,
		Status:      "PLANNING",
		CreatedBy:   userID,
	}

	if err := s.repo.Create(obj); err != nil {
		return nil, err
	}

	resp := ToObjectiveResponse(obj)
	return &resp, nil
}

func (s *Service) GetByID(id uint) (*ObjectiveResponse, error) {
	obj, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("objective not found")
	}

	resp := ToObjectiveResponse(obj)
	return &resp, nil
}

func (s *Service) GetByPeriod(periodID uint, page, limit int) ([]ObjectiveResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	objectives, total, err := s.repo.FindByPeriodID(periodID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	return ToObjectiveResponses(objectives), total, nil
}

func (s *Service) Update(id uint, req UpdateRequest, userID uint) (*ObjectiveResponse, error) {
	obj, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("objective not found")
	}

	if obj.CreatedBy != userID {
		return nil, errors.New("forbidden")
	}

	if req.Title != nil {
		obj.Title = *req.Title
	}
	if req.Description != nil {
		obj.Description = req.Description
	}
	if req.Status != nil {
		obj.Status = *req.Status
	}

	if err := s.repo.Update(obj); err != nil {
		return nil, err
	}

	resp := ToObjectiveResponse(obj)
	return &resp, nil
}

func (s *Service) Delete(id uint, userID uint) error {
	obj, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("objective not found")
	}

	if obj.CreatedBy != userID {
		return errors.New("forbidden")
	}

	return s.repo.SoftDelete(id)
}

func (s *Service) Reorder(orders []struct {
	ID        uint `json:"id"`
	SortOrder int  `json:"sort_order"`
}) error {
	for _, o := range orders {
		if err := s.repo.UpdateSortOrder(o.ID, o.SortOrder); err != nil {
			return err
		}
	}
	return nil
}
