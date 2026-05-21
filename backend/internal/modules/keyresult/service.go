package keyresult

import (
	"encoding/json"
	"errors"
	"math"
	"time"
	"unicode/utf8"
)

var (
	ErrNotFound     = errors.New("key result not found")
	ErrForbidden    = errors.New("forbidden")
	ErrNotMilestone = errors.New("not a milestone key result")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// calcMetricProgress computes progress for METRIC KRs.
// Handles ascending (target > baseline), descending (target < baseline), and equal cases.
// Result is clamped to [0, 100] and rounded to 2 decimals.
func calcMetricProgress(target, baseline, current float64) float64 {
	var progress float64
	if target == baseline {
		if current >= target {
			progress = 100
		} else {
			progress = 0
		}
	} else if target > baseline {
		progress = ((current - baseline) / (target - baseline)) * 100
	} else {
		// descending: target < baseline
		progress = ((baseline - current) / (baseline - target)) * 100
	}
	// Clamp 0-100
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}
	// Round to 2 decimals
	progress = math.Round(progress*100) / 100
	return progress
}

// calcMilestoneProgress returns 100 if status is DONE, else 0.
func calcMilestoneProgress(status string) float64 {
	if status == "DONE" {
		return 100
	}
	return 0
}

// getBaseline returns the baseline value or 0 if nil.
func getBaseline(b *float64) float64 {
	if b == nil {
		return 0
	}
	return *b
}

func (s *Service) Create(objectiveID uint, req CreateRequest, userID uint) (*KeyResultResponse, map[string]string, error) {
	// Default kr_type
	krType := KRTypeMetric
	if req.KRType != nil && *req.KRType != "" {
		krType = *req.KRType
	}

	// Validate kr_type
	validationErrors := map[string]string{}
	if krType != KRTypeMetric && krType != KRTypeMilestone {
		validationErrors["kr_type"] = "must be METRIC or MILESTONE"
	}

	// Validate notes
	if req.Notes != nil && utf8.RuneCountInString(*req.Notes) > 5000 {
		validationErrors["notes"] = "must be at most 5000 characters"
	}

	if krType == KRTypeMetric {
		// METRIC validation
		if req.TargetValue <= 0 {
			validationErrors["target_value"] = "must be greater than 0"
		}
		if req.CurrentValue < 0 {
			validationErrors["current_value"] = "must be >= 0"
		}
		if req.BaselineValue != nil && *req.BaselineValue < 0 {
			validationErrors["baseline_value"] = "must be >= 0"
		}
	} else if krType == KRTypeMilestone {
		// MILESTONE validation: due_date format
		if req.DueDate != nil && *req.DueDate != "" {
			if _, err := time.Parse("2006-01-02", *req.DueDate); err != nil {
				validationErrors["due_date"] = "must be valid YYYY-MM-DD"
			}
		}
	}

	if len(validationErrors) > 0 {
		return nil, validationErrors, errors.New("validation failed")
	}

	var description *string
	if req.Description != "" {
		description = &req.Description
	}
	var metricUnit *string
	if req.MetricUnit != "" {
		metricUnit = &req.MetricUnit
	}

	// Calculate progress
	var progress float64
	if krType == KRTypeMetric {
		baseline := getBaseline(req.BaselineValue)
		progress = calcMetricProgress(req.TargetValue, baseline, req.CurrentValue)
	} else {
		progress = calcMilestoneProgress("PLANNING")
	}

	// Handle due_date: empty string → nil
	var dueDate *string
	if req.DueDate != nil && *req.DueDate != "" {
		dueDate = req.DueDate
	}

	// Handle notes: empty string → nil
	var notes *string
	if req.Notes != nil && *req.Notes != "" {
		notes = req.Notes
	}

	kr := &KeyResult{
		ObjectiveID:   objectiveID,
		Title:         req.Title,
		Description:   description,
		KRType:        krType,
		TargetValue:   req.TargetValue,
		CurrentValue:  req.CurrentValue,
		BaselineValue: req.BaselineValue,
		MetricUnit:    metricUnit,
		DueDate:       dueDate,
		Notes:         notes,
		Progress:      progress,
		Status:        "PLANNING",
		CreatedBy:     userID,
	}

	if err := s.repo.Create(kr); err != nil {
		return nil, nil, err
	}

	resp := ToKeyResultResponse(kr)
	return &resp, nil, nil
}

func (s *Service) Update(id uint, req UpdateRequest, userID uint) (*KeyResultResponse, map[string]interface{}, map[string]interface{}, map[string]string, error) {
	kr, err := s.repo.FindByID(id)
	if err != nil {
		return nil, nil, nil, nil, ErrNotFound
	}

	// Determine next type
	nextType := kr.EffectiveType()
	if req.KRType != nil {
		nextType = *req.KRType
	}

	// Validate kr_type
	validationErrors := map[string]string{}
	if req.KRType != nil {
		if *req.KRType != KRTypeMetric && *req.KRType != KRTypeMilestone {
			validationErrors["kr_type"] = "must be METRIC or MILESTONE"
		}
	}

	// Validate notes
	if req.Notes != nil && utf8.RuneCountInString(*req.Notes) > 5000 {
		validationErrors["notes"] = "must be at most 5000 characters"
	}

	// Validate due_date format if provided
	if req.DueDate != nil && *req.DueDate != "" {
		if _, err := time.Parse("2006-01-02", *req.DueDate); err != nil {
			validationErrors["due_date"] = "must be valid YYYY-MM-DD"
		}
	}

	// Type-specific validation
	if nextType == KRTypeMetric {
		// Check target_value
		effectiveTarget := kr.TargetValue
		if req.TargetValue != nil {
			effectiveTarget = *req.TargetValue
		}
		if req.TargetValue != nil && *req.TargetValue <= 0 {
			validationErrors["target_value"] = "must be greater than 0"
		}
		// If switching to METRIC and existing target <= 0 and no new target provided
		if req.KRType != nil && *req.KRType == KRTypeMetric && kr.EffectiveType() != KRTypeMetric {
			if effectiveTarget <= 0 {
				validationErrors["target_value"] = "target must be > 0 to switch to METRIC"
			}
		}
		if req.CurrentValue != nil && *req.CurrentValue < 0 {
			validationErrors["current_value"] = "must be >= 0"
		}
		if req.BaselineValue != nil && *req.BaselineValue < 0 {
			validationErrors["baseline_value"] = "must be >= 0"
		}
	}

	if len(validationErrors) > 0 {
		return nil, nil, nil, validationErrors, errors.New("validation failed")
	}

	// Build delta diff for activity log (only new fields)
	oldDelta := map[string]interface{}{}
	newDelta := map[string]interface{}{}

	// Track kr_type change
	if req.KRType != nil && *req.KRType != kr.EffectiveType() {
		oldDelta["kr_type"] = kr.EffectiveType()
		newDelta["kr_type"] = *req.KRType
	}

	// Track baseline_value change
	if req.BaselineValue != nil {
		oldBaseline := getBaseline(kr.BaselineValue)
		newBaseline := *req.BaselineValue
		if oldBaseline != newBaseline {
			oldDelta["baseline_value"] = oldBaseline
			newDelta["baseline_value"] = newBaseline
		}
	}

	// Track due_date change
	if req.DueDate != nil {
		oldDueDate := ""
		if kr.DueDate != nil {
			oldDueDate = *kr.DueDate
		}
		newDueDate := *req.DueDate
		if oldDueDate != newDueDate {
			oldDelta["due_date"] = nilIfEmpty(kr.DueDate)
			newDelta["due_date"] = nilIfEmptyStr(newDueDate)
		}
	}

	// Track notes change
	if req.Notes != nil {
		oldNotes := ""
		if kr.Notes != nil {
			oldNotes = *kr.Notes
		}
		newNotes := *req.Notes
		if oldNotes != newNotes {
			oldDelta["notes"] = nilIfEmpty(kr.Notes)
			newDelta["notes"] = nilIfEmptyStr(newNotes)
		}
	}

	// Apply updates
	if req.Title != nil {
		kr.Title = *req.Title
	}
	if req.Description != nil {
		kr.Description = req.Description
	}
	if req.KRType != nil {
		kr.KRType = *req.KRType
	}
	if req.TargetValue != nil {
		kr.TargetValue = *req.TargetValue
	}
	if req.CurrentValue != nil {
		kr.CurrentValue = *req.CurrentValue
	}
	if req.BaselineValue != nil {
		kr.BaselineValue = req.BaselineValue
	}
	if req.MetricUnit != nil {
		kr.MetricUnit = req.MetricUnit
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			kr.DueDate = nil
		} else {
			kr.DueDate = req.DueDate
		}
	}
	if req.Notes != nil {
		if *req.Notes == "" {
			kr.Notes = nil
		} else {
			kr.Notes = req.Notes
		}
	}
	if req.Status != nil {
		kr.Status = *req.Status
	}

	// Recalculate progress based on effective type
	if kr.EffectiveType() == KRTypeMilestone {
		kr.Progress = calcMilestoneProgress(kr.Status)
	} else {
		if kr.Status == "DONE" {
			kr.Progress = 100
		} else {
			baseline := getBaseline(kr.BaselineValue)
			kr.Progress = calcMetricProgress(kr.TargetValue, baseline, kr.CurrentValue)
		}
	}

	if err := s.repo.Update(kr); err != nil {
		return nil, nil, nil, nil, err
	}

	resp := ToKeyResultResponse(kr)
	return &resp, oldDelta, newDelta, nil, nil
}

func (s *Service) Delete(id uint, userID uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return ErrNotFound
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

// ToggleMilestone flips a MILESTONE KR between DONE and ON_TRACK.
func (s *Service) ToggleMilestone(id uint, userID uint) (*KeyResultResponse, map[string]interface{}, map[string]interface{}, error) {
	kr, err := s.repo.FindByID(id)
	if err != nil {
		return nil, nil, nil, ErrNotFound
	}

	if kr.EffectiveType() != KRTypeMilestone {
		return nil, nil, nil, ErrNotMilestone
	}

	oldStatus := kr.Status
	oldProgress := kr.Progress

	if kr.Status == "DONE" {
		kr.Status = "ON_TRACK"
		kr.Progress = 0
	} else {
		kr.Status = "DONE"
		kr.Progress = 100
	}

	if err := s.repo.Update(kr); err != nil {
		return nil, nil, nil, err
	}

	oldFields := map[string]interface{}{
		"status":   oldStatus,
		"progress": oldProgress,
	}
	newFields := map[string]interface{}{
		"status":   kr.Status,
		"progress": kr.Progress,
	}

	resp := ToKeyResultResponse(kr)
	return &resp, oldFields, newFields, nil
}

// Helper to convert map to JSON string for activity log
func ToJSONString(m map[string]interface{}) string {
	if len(m) == 0 {
		return ""
	}
	b, _ := json.Marshal(m)
	return string(b)
}

func nilIfEmpty(s *string) interface{} {
	if s == nil {
		return nil
	}
	return *s
}

func nilIfEmptyStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
