package initiative

import (
	"errors"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(i *Initiative) error {
	return r.db.Create(i).Error
}

func (r *Repository) FindByID(id uint) (*Initiative, error) {
	var i Initiative
	err := r.db.First(&i, id).Error
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func (r *Repository) FindByIDWithChildren(id uint) (*Initiative, error) {
	var i Initiative
	err := r.db.Preload("Children").First(&i, id).Error
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func (r *Repository) FindTreeByKeyResultID(keyResultID uint) ([]Initiative, error) {
	var all []Initiative
	err := r.db.Where("key_result_id = ?", keyResultID).
		Order("created_at ASC").
		Find(&all).Error
	if err != nil {
		return nil, err
	}

	idMap := make(map[uint]*Initiative)
	for i := range all {
		all[i].Children = []Initiative{}
		idMap[all[i].ID] = &all[i]
	}

	var roots []Initiative
	for i := range all {
		if all[i].ParentID == nil {
			roots = append(roots, all[i])
		} else {
			parent, ok := idMap[*all[i].ParentID]
			if ok {
				parent.Children = append(parent.Children, all[i])
			}
		}
	}

	var buildTree func(nodes []Initiative) []Initiative
	buildTree = func(nodes []Initiative) []Initiative {
		for i := range nodes {
			if child, ok := idMap[nodes[i].ID]; ok {
				nodes[i].Children = buildTree(child.Children)
			}
		}
		return nodes
	}

	return buildTree(roots), nil
}

func (r *Repository) FindDirectChildren(parentID uint) ([]Initiative, error) {
	var children []Initiative
	err := r.db.Where("parent_id = ?", parentID).Find(&children).Error
	return children, err
}

func (r *Repository) FindRootByKeyResultID(keyResultID uint) ([]Initiative, error) {
	var initiatives []Initiative
	err := r.db.Where("key_result_id = ? AND parent_id IS NULL", keyResultID).Find(&initiatives).Error
	return initiatives, err
}

func (r *Repository) Update(i *Initiative) error {
	return r.db.Save(i).Error
}

func (r *Repository) UpdateProgress(id uint, progress float64) error {
	return r.db.Model(&Initiative{}).Where("id = ?", id).Update("progress", progress).Error
}

func (r *Repository) SoftDelete(id uint) error {
	return r.db.Delete(&Initiative{}, id).Error
}

func (r *Repository) SoftDeleteByParentID(parentID uint) error {
	return r.db.Where("parent_id = ?", parentID).Delete(&Initiative{}).Error
}

func (r *Repository) HasChildren(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&Initiative{}).Where("parent_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *Repository) FindBySprintAndAssignee(sprintID, userID uint) ([]Initiative, error) {
	var initiatives []Initiative
	err := r.db.Where("sprint_id = ? AND assignee_id = ?", sprintID, userID).
		Order("status ASC, due_date ASC").
		Find(&initiatives).Error
	return initiatives, err
}

func (r *Repository) FindActiveSprintByPeriod(periodID uint) (*uint, error) {
	var sprint struct{ ID uint }
	err := r.db.Table("sprints").
		Where("period_id = ? AND status = ? AND deleted_at IS NULL", periodID, "ACTIVE").
		Select("id").First(&sprint).Error
	if err != nil {
		return nil, err
	}
	return &sprint.ID, nil
}

func (r *Repository) GetDB() *gorm.DB {
	return r.db
}

func (r *Repository) CreateUpdate(u *InitiativeUpdate) error {
	return r.db.Create(u).Error
}

func (r *Repository) AssignToSprint(initiativeID uint, sprintID uint) error {
	var i Initiative
	if err := r.db.First(&i, initiativeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("initiative not found")
		}
		return err
	}

	if i.SprintID != nil {
		return errors.New("initiative is already assigned to a sprint")
	}

	return r.db.Model(&Initiative{}).Where("id = ?", initiativeID).Update("sprint_id", sprintID).Error
}
