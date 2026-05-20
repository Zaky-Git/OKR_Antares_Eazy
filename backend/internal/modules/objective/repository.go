package objective

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(objective *Objective) error {
	return r.db.Create(objective).Error
}

func (r *Repository) FindByID(id uint) (*Objective, error) {
	var obj Objective
	err := r.db.First(&obj, id).Error
	if err != nil {
		return nil, err
	}
	return &obj, nil
}

func (r *Repository) FindByPeriodID(periodID uint, page, limit int) ([]Objective, int64, error) {
	var objectives []Objective
	var total int64

	query := r.db.Where("period_id = ?", periodID)
	query.Model(&Objective{}).Count(&total)

	offset := (page - 1) * limit
	err := query.Order("sort_order ASC, created_at DESC").Offset(offset).Limit(limit).Find(&objectives).Error
	return objectives, total, err
}

func (r *Repository) Update(objective *Objective) error {
	return r.db.Save(objective).Error
}

func (r *Repository) SoftDelete(id uint) error {
	return r.db.Delete(&Objective{}, id).Error
}

func (r *Repository) UpdateProgress(id uint, progress float64) error {
	return r.db.Model(&Objective{}).Where("id = ?", id).Update("progress", progress).Error
}

func (r *Repository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&Objective{}).Where("id = ?", id).Update("status", status).Error
}

func (r *Repository) UpdateSortOrder(id uint, sortOrder int) error {
	return r.db.Model(&Objective{}).Where("id = ?", id).Update("sort_order", sortOrder).Error
}
