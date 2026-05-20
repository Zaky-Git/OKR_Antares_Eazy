package objective

import (
	"errors"
	"strings"

	"gorm.io/gorm"
)

var (
	ErrNotFound  = errors.New("objective not found")
	ErrForbidden = errors.New("forbidden")
)

// FieldErrors maps field name to error message.
type FieldErrors map[string]string

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// validateMasterFK checks each non-nil FK exists in its master table (live).
// Returns FieldErrors if any FK invalid, nil otherwise.
func (s *Service) validateMasterFK(strategyID, segmentID, divisionID, ownerID *uint) FieldErrors {
	errs := FieldErrors{}
	db := s.repo.GetDB()

	if strategyID != nil {
		var count int64
		db.Table("strategies").Where("id = ? AND deleted_at IS NULL", *strategyID).Count(&count)
		if count == 0 {
			errs["strategy_id"] = "Strategy not found"
		}
	}
	if segmentID != nil {
		var count int64
		db.Table("segments").Where("id = ? AND deleted_at IS NULL", *segmentID).Count(&count)
		if count == 0 {
			errs["segment_id"] = "Segment not found"
		}
	}
	if divisionID != nil {
		var count int64
		db.Table("divisions").Where("id = ? AND deleted_at IS NULL", *divisionID).Count(&count)
		if count == 0 {
			errs["division_id"] = "Division not found"
		}
	}
	if ownerID != nil {
		var count int64
		db.Table("users").Where("id = ? AND deleted_at IS NULL", *ownerID).Count(&count)
		if count == 0 {
			errs["owner_id"] = "Owner user not found"
		}
	}

	if len(errs) == 0 {
		return nil
	}
	return errs
}

// validateNotes ensures notes length <= 5000 chars.
func validateNotes(notes *string) FieldErrors {
	if notes == nil {
		return nil
	}
	if len(*notes) > 5000 {
		return FieldErrors{"notes": "Notes must be at most 5000 characters"}
	}
	return nil
}

// trimNullify returns nil if the string is empty after trim, else pointer to trimmed string.
func trimNullify(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

func (s *Service) Create(req CreateRequest, userID uint) (*ObjectiveResponse, FieldErrors, error) {
	// Validate notes
	if errs := validateNotes(req.Notes); errs != nil {
		return nil, errs, nil
	}
	// Validate FK existence
	if errs := s.validateMasterFK(req.StrategyID, req.SegmentID, req.DivisionID, req.OwnerID); errs != nil {
		return nil, errs, nil
	}

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
		StrategyID:  req.StrategyID,
		SegmentID:   req.SegmentID,
		DivisionID:  req.DivisionID,
		OwnerID:     req.OwnerID,
		Notes:       trimNullify(req.Notes),
	}

	if err := s.repo.Create(obj); err != nil {
		return nil, nil, err
	}

	// Reload with preloads for response
	loaded, err := s.repo.FindByID(obj.ID)
	if err != nil {
		resp := ToObjectiveResponse(obj)
		return &resp, nil, nil
	}
	resp := ToObjectiveResponse(loaded)
	return &resp, nil, nil
}

func (s *Service) GetByID(id uint) (*ObjectiveResponse, error) {
	obj, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
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

// GetByFilter returns objectives matching the given filter. Returns 0 results with no error
// if filter is valid but matches nothing. Returns FieldErrors if any filter ID references
// a non-existent master.
func (s *Service) GetByFilter(f FindFilter) ([]ObjectiveResponse, int64, FieldErrors, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 10
	}

	// Validate filter master IDs
	errs := s.validateMasterFK(f.StrategyID, f.SegmentID, f.DivisionID, nil)
	if errs != nil {
		return nil, 0, errs, nil
	}

	objectives, total, err := s.repo.FindByFilter(f)
	if err != nil {
		return nil, 0, nil, err
	}
	return ToObjectiveResponses(objectives), total, nil, nil
}

// UpdateResult provides the snapshot pre-update and resulting objective so the handler can build a delta diff.
type UpdateResult struct {
	Pre    *Objective
	Post   *ObjectiveResponse
	PostDB *Objective
}

func (s *Service) Update(id uint, req UpdateRequest, userID uint) (*UpdateResult, FieldErrors, error) {
	// Load plain (without preloads) for pre-snapshot
	plain, err := s.repo.FindByIDPlain(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}
	if plain.CreatedBy != userID {
		return nil, nil, ErrForbidden
	}

	// Snapshot copy
	pre := *plain

	// Apply patches
	if req.Title != nil {
		plain.Title = *req.Title
	}
	if req.Description != nil {
		plain.Description = req.Description
	}
	if req.Status != nil {
		plain.Status = *req.Status
	}
	if req.StrategyID.Present {
		plain.StrategyID = req.StrategyID.Value
	}
	if req.SegmentID.Present {
		plain.SegmentID = req.SegmentID.Value
	}
	if req.DivisionID.Present {
		plain.DivisionID = req.DivisionID.Value
	}
	if req.OwnerID.Present {
		plain.OwnerID = req.OwnerID.Value
	}
	if req.Notes.Present {
		// Trim and nullify empty
		if req.Notes.Value == nil {
			plain.Notes = nil
		} else {
			plain.Notes = trimNullify(req.Notes.Value)
		}
	}

	// Validate notes after patch
	if errs := validateNotes(plain.Notes); errs != nil {
		return nil, errs, nil
	}

	// Validate FK after patch (only the patched ones to avoid extra queries)
	var stratCheck, segCheck, divCheck, ownCheck *uint
	if req.StrategyID.Present {
		stratCheck = plain.StrategyID
	}
	if req.SegmentID.Present {
		segCheck = plain.SegmentID
	}
	if req.DivisionID.Present {
		divCheck = plain.DivisionID
	}
	if req.OwnerID.Present {
		ownCheck = plain.OwnerID
	}
	if errs := s.validateMasterFK(stratCheck, segCheck, divCheck, ownCheck); errs != nil {
		return nil, errs, nil
	}

	if err := s.repo.Update(plain); err != nil {
		return nil, nil, err
	}

	// Reload with preloads for response
	loaded, err := s.repo.FindByID(id)
	if err != nil {
		resp := ToObjectiveResponse(plain)
		return &UpdateResult{Pre: &pre, Post: &resp, PostDB: plain}, nil, nil
	}
	resp := ToObjectiveResponse(loaded)
	return &UpdateResult{Pre: &pre, Post: &resp, PostDB: loaded}, nil, nil
}

func (s *Service) Delete(id uint, userID uint) error {
	obj, err := s.repo.FindByIDPlain(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}

	if obj.CreatedBy != userID {
		return ErrForbidden
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
