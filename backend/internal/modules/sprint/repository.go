package sprint

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(sprint *Sprint) error {
	return r.db.Create(sprint).Error
}

func (r *Repository) FindByID(id uint) (*Sprint, error) {
	var s Sprint
	err := r.db.First(&s, id).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) FindByPeriodID(periodID uint) ([]Sprint, error) {
	var sprints []Sprint
	err := r.db.Where("period_id = ?", periodID).Order("start_date ASC").Find(&sprints).Error
	return sprints, err
}

func (r *Repository) FindActiveByPeriodID(periodID uint) (*Sprint, error) {
	var s Sprint
	err := r.db.Where("period_id = ? AND status = ?", periodID, "ACTIVE").First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) Update(sprint *Sprint) error {
	return r.db.Save(sprint).Error
}

func (r *Repository) SoftDelete(id uint) error {
	return r.db.Delete(&Sprint{}, id).Error
}
