package objective

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetDB() *gorm.DB {
	return r.db
}

// preloadRelations attaches Strategy/Segment/Division/Owner preload, all filtered to live records.
func (r *Repository) preloadRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Strategy", "deleted_at IS NULL").
		Preload("Segment", "deleted_at IS NULL").
		Preload("Division", "deleted_at IS NULL").
		Preload("Owner", "deleted_at IS NULL")
}

func (r *Repository) Create(objective *Objective) error {
	return r.db.Create(objective).Error
}

func (r *Repository) FindByID(id uint) (*Objective, error) {
	var obj Objective
	err := r.preloadRelations(r.db).First(&obj, id).Error
	if err != nil {
		return nil, err
	}
	return &obj, nil
}

// FindByIDPlain returns the objective without preloads (used for ownership and pre-update snapshot).
func (r *Repository) FindByIDPlain(id uint) (*Objective, error) {
	var obj Objective
	err := r.db.First(&obj, id).Error
	if err != nil {
		return nil, err
	}
	return &obj, nil
}

// FindFilter holds list filter parameters.
type FindFilter struct {
	PeriodID   uint
	StrategyID *uint
	SegmentID  *uint
	DivisionID *uint
	Page       int
	Limit      int
}

func (r *Repository) FindByFilter(f FindFilter) ([]Objective, int64, error) {
	var objectives []Objective
	var total int64

	q := r.db.Model(&Objective{}).Where("period_id = ?", f.PeriodID)
	if f.StrategyID != nil {
		q = q.Where("strategy_id = ?", *f.StrategyID)
	}
	if f.SegmentID != nil {
		q = q.Where("segment_id = ?", *f.SegmentID)
	}
	if f.DivisionID != nil {
		q = q.Where("division_id = ?", *f.DivisionID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := f.Page
	if page < 1 {
		page = 1
	}
	limit := f.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	err := r.preloadRelations(q).
		Order("sort_order ASC, created_at DESC").
		Offset(offset).Limit(limit).
		Find(&objectives).Error
	return objectives, total, err
}

// FindByPeriodID is kept for backward compat; delegates to FindByFilter.
func (r *Repository) FindByPeriodID(periodID uint, page, limit int) ([]Objective, int64, error) {
	return r.FindByFilter(FindFilter{PeriodID: periodID, Page: page, Limit: limit})
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
