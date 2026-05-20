package strategy

import (
	"errors"
	"strings"

	"github.com/antares-eazy/okr-backend/internal/shared/validation"
	"gorm.io/gorm"
)

var (
	ErrNotFound      = errors.New("not_found")
	ErrDuplicateName = errors.New("duplicate_name")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List() ([]StrategyResponse, error) {
	items, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	return ToResponses(items), nil
}

// ListPaginated returns paginated strategies with optional search.
func (s *Service) ListPaginated(page, limit int, search string) ([]StrategyResponse, int64, error) {
	items, total, err := s.repo.FindPaginated(page, limit, search)
	if err != nil {
		return nil, 0, err
	}
	return ToResponses(items), total, nil
}

func (s *Service) GetByID(id uint) (*StrategyResponse, error) {
	item, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	resp := ToResponse(item)
	return &resp, nil
}

// validateFields checks length, color, and sort_order bounds.
func validateFields(name, color string, description *string, sortOrder *int) FieldErrors {
	errs := FieldErrors{}
	trimmed := strings.TrimSpace(name)
	if l := len(trimmed); l < 1 || l > 100 {
		errs["name"] = "Name length must be 1-100 characters"
	}
	if !validation.IsValidHex(color) {
		errs["color"] = "Color must match #RRGGBB hex pattern"
	}
	if description != nil && len(*description) > 500 {
		errs["description"] = "Description must be at most 500 characters"
	}
	if sortOrder != nil && (*sortOrder < 0 || *sortOrder > 9999) {
		errs["sort_order"] = "Sort order must be between 0 and 9999"
	}
	if len(errs) == 0 {
		return nil
	}
	return errs
}

func (s *Service) Create(req CreateRequest) (*StrategyResponse, FieldErrors, error) {
	if errs := validateFields(req.Name, req.Color, req.Description, req.SortOrder); errs != nil {
		return nil, errs, nil
	}

	// Uniqueness check (CI-trim)
	existing, err := s.repo.FindByNameCI(req.Name)
	if err != nil {
		return nil, nil, err
	}
	if existing != nil {
		return nil, FieldErrors{"name": "Name already exists"}, nil
	}

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	item := &Strategy{
		Name:        strings.TrimSpace(req.Name),
		Description: req.Description,
		Color:       req.Color,
		SortOrder:   sortOrder,
		IsActive:    isActive,
	}

	if err := s.repo.Create(item); err != nil {
		return nil, nil, err
	}

	resp := ToResponse(item)
	return &resp, nil, nil
}

func (s *Service) Update(id uint, req UpdateRequest) (*StrategyResponse, FieldErrors, error) {
	item, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}

	// Apply changes
	newName := item.Name
	newColor := item.Color
	newDesc := item.Description
	newSortOrder := item.SortOrder

	if req.Name != nil {
		newName = *req.Name
	}
	if req.Color != nil {
		newColor = *req.Color
	}
	if req.Description != nil {
		newDesc = req.Description
	}
	if req.SortOrder != nil {
		newSortOrder = *req.SortOrder
	}

	if errs := validateFields(newName, newColor, newDesc, &newSortOrder); errs != nil {
		return nil, errs, nil
	}

	// Uniqueness check (skip if name unchanged)
	if !strings.EqualFold(strings.TrimSpace(newName), strings.TrimSpace(item.Name)) {
		existing, err := s.repo.FindByNameCI(newName)
		if err != nil {
			return nil, nil, err
		}
		if existing != nil && existing.ID != item.ID {
			return nil, FieldErrors{"name": "Name already exists"}, nil
		}
	}

	item.Name = strings.TrimSpace(newName)
	item.Color = newColor
	item.Description = newDesc
	item.SortOrder = newSortOrder
	if req.IsActive != nil {
		item.IsActive = *req.IsActive
	}

	if err := s.repo.Update(item); err != nil {
		return nil, nil, err
	}

	resp := ToResponse(item)
	return &resp, nil, nil
}

// Delete soft-deletes the strategy and nulls out objectives.strategy_id in one transaction.
func (s *Service) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}

	return s.repo.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := s.repo.NullObjectiveStrategyTx(tx, id); err != nil {
			return err
		}
		return s.repo.SoftDeleteTx(tx, id)
	})
}
