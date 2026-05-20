package period

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindAll() ([]Period, error) {
	var periods []Period
	err := r.db.Order("year DESC, quarter ASC").Find(&periods).Error
	return periods, err
}

func (r *Repository) FindByYearAndQuarter(year int, quarter string) (*Period, error) {
	var p Period
	err := r.db.Where("year = ? AND quarter = ?", year, quarter).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) FindByYear(year int) ([]Period, error) {
	var periods []Period
	err := r.db.Where("year = ?", year).Order("quarter ASC").Find(&periods).Error
	return periods, err
}

func (r *Repository) Create(period *Period) error {
	return r.db.Create(period).Error
}

func (r *Repository) UpdateIsCurrent(id uint, isCurrent bool) error {
	return r.db.Model(&Period{}).Where("id = ?", id).Update("is_current", isCurrent).Error
}

func (r *Repository) ClearAllCurrent() error {
	return r.db.Model(&Period{}).Where("is_current = ?", true).Update("is_current", false).Error
}

func (r *Repository) FindByID(id uint) (*Period, error) {
	var p Period
	err := r.db.First(&p, id).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}
