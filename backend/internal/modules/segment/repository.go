package segment

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

func (r *Repository) Create(s *Segment) error {
	return r.db.Create(s).Error
}

func (r *Repository) FindByID(id uint) (*Segment, error) {
	var s Segment
	if err := r.db.First(&s, id).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) FindAll() ([]Segment, error) {
	var items []Segment
	err := r.db.Order("LOWER(name) ASC").Find(&items).Error
	return items, err
}

// FindPaginated returns paginated segments with optional search filter.
func (r *Repository) FindPaginated(page, limit int, search string) ([]Segment, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	query := r.db.Model(&Segment{})
	if search != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(search)) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []Segment
	err := query.Order("LOWER(name) ASC").Offset(offset).Limit(limit).Find(&items).Error
	return items, total, err
}

func (r *Repository) FindByNameCI(name string) (*Segment, error) {
	normalized := strings.ToLower(strings.TrimSpace(name))
	var s Segment
	err := r.db.Where("LOWER(TRIM(name)) = ?", normalized).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *Repository) Update(s *Segment) error {
	return r.db.Save(s).Error
}

func (r *Repository) SoftDeleteTx(tx *gorm.DB, id uint) error {
	return tx.Delete(&Segment{}, id).Error
}

func (r *Repository) NullObjectiveSegmentTx(tx *gorm.DB, id uint) error {
	return tx.Table("objectives").Where("segment_id = ?", id).Update("segment_id", nil).Error
}
