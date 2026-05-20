package division

import (
	"errors"
	"strings"

	"github.com/antares-eazy/okr-backend/internal/shared/validation"
	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not_found")

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List() ([]DivisionResponse, error) {
	items, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	return ToResponses(items), nil
}

// ListPaginated returns paginated divisions with optional search.
func (s *Service) ListPaginated(page, limit int, search string) ([]DivisionResponse, int64, error) {
	items, total, err := s.repo.FindPaginated(page, limit, search)
	if err != nil {
		return nil, 0, err
	}
	return ToResponses(items), total, nil
}

func (s *Service) GetByID(id uint) (*DivisionResponse, error) {
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

func validateFields(name, code, color string, description *string) FieldErrors {
	errs := FieldErrors{}
	trimmedName := strings.TrimSpace(name)
	if l := len(trimmedName); l < 1 || l > 100 {
		errs["name"] = "Name length must be 1-100 characters"
	}
	trimmedCode := strings.TrimSpace(code)
	if l := len(trimmedCode); l < 1 || l > 20 {
		errs["code"] = "Code length must be 1-20 characters"
	}
	if !validation.IsValidHex(color) {
		errs["color"] = "Color must match #RRGGBB hex pattern"
	}
	if description != nil && len(*description) > 500 {
		errs["description"] = "Description must be at most 500 characters"
	}
	if len(errs) == 0 {
		return nil
	}
	return errs
}

func (s *Service) Create(req CreateRequest) (*DivisionResponse, FieldErrors, error) {
	if errs := validateFields(req.Name, req.Code, req.Color, req.Description); errs != nil {
		return nil, errs, nil
	}
	if existing, err := s.repo.FindByNameCI(req.Name); err != nil {
		return nil, nil, err
	} else if existing != nil {
		return nil, FieldErrors{"name": "Name already exists"}, nil
	}
	if existing, err := s.repo.FindByCodeCI(req.Code); err != nil {
		return nil, nil, err
	} else if existing != nil {
		return nil, FieldErrors{"code": "Code already exists"}, nil
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	item := &Division{
		Name:        strings.TrimSpace(req.Name),
		Code:        strings.TrimSpace(req.Code),
		Description: req.Description,
		Color:       req.Color,
		IsActive:    isActive,
	}
	if err := s.repo.Create(item); err != nil {
		return nil, nil, err
	}
	resp := ToResponse(item)
	return &resp, nil, nil
}

func (s *Service) Update(id uint, req UpdateRequest) (*DivisionResponse, FieldErrors, error) {
	item, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}
	newName := item.Name
	newCode := item.Code
	newColor := item.Color
	newDesc := item.Description
	if req.Name != nil {
		newName = *req.Name
	}
	if req.Code != nil {
		newCode = *req.Code
	}
	if req.Color != nil {
		newColor = *req.Color
	}
	if req.Description != nil {
		newDesc = req.Description
	}
	if errs := validateFields(newName, newCode, newColor, newDesc); errs != nil {
		return nil, errs, nil
	}
	if !strings.EqualFold(strings.TrimSpace(newName), strings.TrimSpace(item.Name)) {
		if existing, err := s.repo.FindByNameCI(newName); err != nil {
			return nil, nil, err
		} else if existing != nil && existing.ID != item.ID {
			return nil, FieldErrors{"name": "Name already exists"}, nil
		}
	}
	if !strings.EqualFold(strings.TrimSpace(newCode), strings.TrimSpace(item.Code)) {
		if existing, err := s.repo.FindByCodeCI(newCode); err != nil {
			return nil, nil, err
		} else if existing != nil && existing.ID != item.ID {
			return nil, FieldErrors{"code": "Code already exists"}, nil
		}
	}
	item.Name = strings.TrimSpace(newName)
	item.Code = strings.TrimSpace(newCode)
	item.Color = newColor
	item.Description = newDesc
	if req.IsActive != nil {
		item.IsActive = *req.IsActive
	}
	if err := s.repo.Update(item); err != nil {
		return nil, nil, err
	}
	resp := ToResponse(item)
	return &resp, nil, nil
}

func (s *Service) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}
	return s.repo.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := s.repo.NullObjectiveDivisionTx(tx, id); err != nil {
			return err
		}
		return s.repo.SoftDeleteTx(tx, id)
	})
}
