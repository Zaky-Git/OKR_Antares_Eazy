package initiative

import (
	"errors"
	"time"

	"github.com/antares-eazy/okr-backend/internal/modules/keyresult"
	"github.com/antares-eazy/okr-backend/internal/modules/objective"
	"gorm.io/gorm"
)

type Service struct {
	repo          *Repository
	krRepo        *keyresult.Repository
	objectiveRepo *objective.Repository
}

func NewService(repo *Repository, krRepo *keyresult.Repository, objRepo *objective.Repository) *Service {
	return &Service{repo: repo, krRepo: krRepo, objectiveRepo: objRepo}
}

func (s *Service) Create(keyResultID uint, req CreateRequest, userID uint) (*InitiativeResponse, error) {
	var description *string
	if req.Description != "" {
		description = &req.Description
	}

	var dueDate *time.Time
	if req.DueDate != "" {
		d, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			return nil, errors.New("invalid due_date format, use YYYY-MM-DD")
		}
		dueDate = &d
	}

	initiative := &Initiative{
		KeyResultID: keyResultID,
		SprintID:    req.SprintID,
		Title:       req.Title,
		Description: description,
		AssigneeID:  req.AssigneeID,
		Status:      "TODO",
		DueDate:     dueDate,
		CreatedBy:   userID,
	}

	err := s.repo.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(initiative).Error; err != nil {
			return err
		}
		if err := s.recalculateKeyResult(tx, keyResultID); err != nil {
			return err
		}
		var kr keyresult.KeyResult
		if err := tx.First(&kr, keyResultID).Error; err != nil {
			return err
		}
		return s.recalculateObjective(tx, kr.ObjectiveID)
	})

	if err != nil {
		return nil, err
	}

	resp := ToInitiativeResponse(initiative)
	return &resp, nil
}

func (s *Service) CreateChild(parentID uint, req CreateRequest, userID uint) (*InitiativeResponse, error) {
	parent, err := s.repo.FindByID(parentID)
	if err != nil {
		return nil, errors.New("parent initiative not found")
	}

	var description *string
	if req.Description != "" {
		description = &req.Description
	}

	var dueDate *time.Time
	if req.DueDate != "" {
		d, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			return nil, errors.New("invalid due_date format, use YYYY-MM-DD")
		}
		dueDate = &d
	}

	child := &Initiative{
		KeyResultID: parent.KeyResultID,
		SprintID:    req.SprintID,
		ParentID:    &parentID,
		Title:       req.Title,
		Description: description,
		AssigneeID:  req.AssigneeID,
		Status:      "TODO",
		DueDate:     dueDate,
		CreatedBy:   userID,
	}


	err = s.repo.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(child).Error; err != nil {
			return err
		}


		var children []Initiative
		if err := tx.Where("parent_id = ?", parentID).Find(&children).Error; err != nil {
			return err
		}

		var total float64
		for _, c := range children {
			total += c.Progress
		}
		avg := total / float64(len(children))

		if err := tx.Model(&Initiative{}).Where("id = ?", parentID).Update("progress", avg).Error; err != nil {
			return err
		}


		if err := s.recalculateParentChain(tx, parent); err != nil {
			return err
		}


		if err := s.recalculateKeyResult(tx, parent.KeyResultID); err != nil {
			return err
		}

		var kr keyresult.KeyResult
		if err := tx.First(&kr, parent.KeyResultID).Error; err != nil {
			return err
		}
		return s.recalculateObjective(tx, kr.ObjectiveID)
	})

	if err != nil {
		return nil, err
	}

	resp := ToInitiativeResponse(child)
	return &resp, nil
}

func (s *Service) GetTree(keyResultID uint) ([]InitiativeResponse, error) {
	initiatives, err := s.repo.FindTreeByKeyResultID(keyResultID)
	if err != nil {
		return nil, err
	}
	return ToInitiativeResponses(initiatives), nil
}

func (s *Service) Update(id uint, req UpdateRequest, userID uint) (*InitiativeResponse, error) {
	initiative, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("initiative not found")
	}


	if initiative.CreatedBy != userID && (initiative.AssigneeID == nil || *initiative.AssigneeID != userID) {
		return nil, errors.New("forbidden")
	}

	statusChanged := false
	if req.Title != nil {
		initiative.Title = *req.Title
	}
	if req.Description != nil {
		initiative.Description = req.Description
	}
	if req.AssigneeID != nil {
		initiative.AssigneeID = req.AssigneeID
	}
	if req.SprintID != nil {
		initiative.SprintID = req.SprintID
	}
	if req.Status != nil {
		if *req.Status != initiative.Status {
			statusChanged = true
		}
		initiative.Status = *req.Status

		if *req.Status == "DONE" {
			initiative.Progress = 100
		}
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			initiative.DueDate = nil
		} else {
			d, err := time.Parse("2006-01-02", *req.DueDate)
			if err != nil {
				return nil, errors.New("invalid due_date format")
			}
			initiative.DueDate = &d
		}
	}


	if statusChanged {
		err = s.repo.GetDB().Transaction(func(tx *gorm.DB) error {
			if err := tx.Save(initiative).Error; err != nil {
				return err
			}
			if err := s.recalculateParentChain(tx, initiative); err != nil {
				return err
			}
			if err := s.recalculateKeyResult(tx, initiative.KeyResultID); err != nil {
				return err
			}
			var kr keyresult.KeyResult
			if err := tx.First(&kr, initiative.KeyResultID).Error; err != nil {
				return err
			}
			return s.recalculateObjective(tx, kr.ObjectiveID)
		})
		if err != nil {
			return nil, err
		}
	} else {
		if err := s.repo.Update(initiative); err != nil {
			return nil, err
		}
	}

	resp := ToInitiativeResponse(initiative)
	return &resp, nil
}

func (s *Service) UpdateProgress(id uint, req ProgressUpdateRequest, userID uint) (*InitiativeResponse, error) {
	initiative, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("initiative not found")
	}


	if initiative.CreatedBy != userID && (initiative.AssigneeID == nil || *initiative.AssigneeID != userID) {
		return nil, errors.New("forbidden")
	}


	hasChildren, _ := s.repo.HasChildren(id)
	if hasChildren {
		return nil, errors.New("cannot manually update progress for parent initiative")
	}


	progressBefore := initiative.Progress


	err = s.repo.GetDB().Transaction(func(tx *gorm.DB) error {

		initiative.Progress = req.Progress
		if err := tx.Save(initiative).Error; err != nil {
			return err
		}


		var note, blocker *string
		if req.Note != "" {
			note = &req.Note
		}
		if req.Blocker != "" {
			blocker = &req.Blocker
		}
		update := &InitiativeUpdate{
			InitiativeID:   id,
			UserID:         userID,
			ProgressBefore: progressBefore,
			ProgressAfter:  req.Progress,
			Note:           note,
			Blocker:        blocker,
		}
		if err := tx.Create(update).Error; err != nil {
			return err
		}


		if err := s.recalculateParentChain(tx, initiative); err != nil {
			return err
		}


		if err := s.recalculateKeyResult(tx, initiative.KeyResultID); err != nil {
			return err
		}


		var kr keyresult.KeyResult
		if err := tx.First(&kr, initiative.KeyResultID).Error; err != nil {
			return err
		}
		return s.recalculateObjective(tx, kr.ObjectiveID)
	})

	if err != nil {
		return nil, err
	}


	initiative, _ = s.repo.FindByID(id)
	resp := ToInitiativeResponse(initiative)
	return &resp, nil
}

func (s *Service) recalculateParentChain(tx *gorm.DB, initiative *Initiative) error {
	if initiative.ParentID == nil {
		return nil
	}

	parentID := *initiative.ParentID

	for parentID != 0 {

		var children []Initiative
		if err := tx.Where("parent_id = ? AND status != ?", parentID, "CANCELLED").Find(&children).Error; err != nil {
			return err
		}

		if len(children) == 0 {

			if err := tx.Model(&Initiative{}).Where("id = ?", parentID).Update("progress", 0).Error; err != nil {
				return err
			}
		} else {

			var total float64
			for _, c := range children {
				total += c.Progress
			}
			avg := total / float64(len(children))
			if err := tx.Model(&Initiative{}).Where("id = ?", parentID).Update("progress", avg).Error; err != nil {
				return err
			}
		}


		var parent Initiative
		if err := tx.First(&parent, parentID).Error; err != nil {
			return err
		}
		if parent.ParentID == nil {
			break
		}
		parentID = *parent.ParentID
	}

	return nil
}

func (s *Service) recalculateKeyResult(tx *gorm.DB, keyResultID uint) error {

	var rootInitiatives []Initiative
	if err := tx.Where("key_result_id = ? AND parent_id IS NULL AND status != ?", keyResultID, "CANCELLED").Find(&rootInitiatives).Error; err != nil {
		return err
	}

	if len(rootInitiatives) == 0 {

		var kr keyresult.KeyResult
		if err := tx.First(&kr, keyResultID).Error; err != nil {
			return err
		}
		kr.Progress = 0
		kr.CurrentValue = 0
		return tx.Save(&kr).Error
	}

	var total float64
	for _, i := range rootInitiatives {
		total += i.Progress
	}
	avg := total / float64(len(rootInitiatives))


	var kr keyresult.KeyResult
	if err := tx.First(&kr, keyResultID).Error; err != nil {
		return err
	}

	kr.Progress = avg
	kr.CurrentValue = (avg / 100) * kr.TargetValue
	return tx.Save(&kr).Error
}

func (s *Service) recalculateObjective(tx *gorm.DB, objectiveID uint) error {
	var krs []keyresult.KeyResult
	if err := tx.Where("objective_id = ?", objectiveID).Find(&krs).Error; err != nil {
		return err
	}

	if len(krs) == 0 {
		return nil
	}

	var total float64
	for _, kr := range krs {
		total += kr.Progress
	}
	avg := total / float64(len(krs))

	return tx.Model(&objective.Objective{}).Where("id = ?", objectiveID).Update("progress", avg).Error
}

func (s *Service) GetMyInitiativesInActiveSprint(periodID, userID uint) ([]InitiativeResponse, *uint, error) {

	sprintID, err := s.repo.FindActiveSprintByPeriod(periodID)
	if err != nil {
		return nil, nil, nil
	}

	initiatives, err := s.repo.FindBySprintAndAssignee(*sprintID, userID)
	if err != nil {
		return nil, nil, err
	}

	return ToInitiativeResponses(initiatives), sprintID, nil
}

func (s *Service) Delete(id uint, userID uint) error {
	initiative, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("initiative not found")
	}

	if initiative.CreatedBy != userID && (initiative.AssigneeID == nil || *initiative.AssigneeID != userID) {
		return errors.New("forbidden")
	}

	keyResultID := initiative.KeyResultID

	return s.repo.GetDB().Transaction(func(tx *gorm.DB) error {
		if err := s.cascadeDelete(tx, id); err != nil {
			return err
		}
		if err := tx.Delete(&Initiative{}, id).Error; err != nil {
			return err
		}
		if initiative.ParentID != nil {
			if err := s.recalculateParentChain(tx, initiative); err != nil {
				return err
			}
		}
		if err := s.recalculateKeyResult(tx, keyResultID); err != nil {
			return err
		}
		var kr keyresult.KeyResult
		if err := tx.First(&kr, keyResultID).Error; err != nil {
			return err
		}
		return s.recalculateObjective(tx, kr.ObjectiveID)
	})
}

func (s *Service) cascadeDelete(tx *gorm.DB, parentID uint) error {
	var children []Initiative
	if err := tx.Where("parent_id = ?", parentID).Find(&children).Error; err != nil {
		return err
	}

	for _, child := range children {
		if err := s.cascadeDelete(tx, child.ID); err != nil {
			return err
		}
		if err := tx.Delete(&Initiative{}, child.ID).Error; err != nil {
			return err
		}
	}

	return nil
}
