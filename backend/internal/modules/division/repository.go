package division

import (
	"errors"
	"strings"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetDB() *gorm.DB { return r.db }

func (r *Repository) Create(d *Division) error {
	return r.db.Create(d).Error
}

func (r *Repository) FindByID(id uint) (*Division, error) {
	var d Division
	if err := r.db.First(&d, id).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *Repository) FindAll() ([]Division, error) {
	var items []Division
	err := r.db.Order("LOWER(name) ASC").Find(&items).Error
	return items, err
}

// FindPaginated returns paginated divisions with optional search filter.
func (r *Repository) FindPaginated(page, limit int, search string) ([]Division, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	query := r.db.Model(&Division{})
	if search != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(search)) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(description) LIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []Division
	err := query.Order("LOWER(name) ASC").Offset(offset).Limit(limit).Find(&items).Error
	return items, total, err
}

// FindByNameCI returns nil if no live record matches the trimmed CI name.
func (r *Repository) FindByNameCI(name string) (*Division, error) {
	normalized := strings.ToLower(strings.TrimSpace(name))
	var d Division
	err := r.db.Where("LOWER(TRIM(name)) = ?", normalized).First(&d).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

// FindByCodeCI returns nil if no live record matches the trimmed CI code.
func (r *Repository) FindByCodeCI(code string) (*Division, error) {
	normalized := strings.ToLower(strings.TrimSpace(code))
	var d Division
	err := r.db.Where("LOWER(TRIM(code)) = ?", normalized).First(&d).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

func (r *Repository) Update(d *Division) error {
	return r.db.Save(d).Error
}

func (r *Repository) SoftDeleteTx(tx *gorm.DB, id uint) error {
	return tx.Delete(&Division{}, id).Error
}

func (r *Repository) NullObjectiveDivisionTx(tx *gorm.DB, id uint) error {
	return tx.Table("objectives").Where("division_id = ?", id).Update("division_id", nil).Error
}
