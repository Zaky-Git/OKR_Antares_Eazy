package strategy

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

// GetDB exposes the underlying gorm DB for transactional cross-module use.
func (r *Repository) GetDB() *gorm.DB {
	return r.db
}

func (r *Repository) Create(s *Strategy) error {
	return r.db.Create(s).Error
}

func (r *Repository) FindByID(id uint) (*Strategy, error) {
	var s Strategy
	if err := r.db.First(&s, id).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

// FindAll returns live strategies sorted by sort_order ASC then LOWER(name) ASC.
func (r *Repository) FindAll() ([]Strategy, error) {
	var items []Strategy
	err := r.db.Order("sort_order ASC, LOWER(name) ASC").Find(&items).Error
	return items, err
}

// FindPaginated returns paginated strategies with optional search filter.
func (r *Repository) FindPaginated(page, limit int, search string) ([]Strategy, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	query := r.db.Model(&Strategy{})
	if search != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(search)) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []Strategy
	err := query.Order("sort_order ASC, LOWER(name) ASC").Offset(offset).Limit(limit).Find(&items).Error
	return items, total, err
}

// FindByNameCI looks up a live strategy with case-insensitive trimmed name match.
// Returns nil if not found.
func (r *Repository) FindByNameCI(name string) (*Strategy, error) {
	normalized := strings.ToLower(strings.TrimSpace(name))
	var s Strategy
	err := r.db.Where("LOWER(TRIM(name)) = ?", normalized).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *Repository) Update(s *Strategy) error {
	return r.db.Save(s).Error
}

// SoftDeleteTx performs soft delete inside the given transaction.
func (r *Repository) SoftDeleteTx(tx *gorm.DB, id uint) error {
	return tx.Delete(&Strategy{}, id).Error
}

// NullObjectiveStrategyTx sets objectives.strategy_id = NULL where strategy_id = id.
func (r *Repository) NullObjectiveStrategyTx(tx *gorm.DB, id uint) error {
	return tx.Table("objectives").Where("strategy_id = ?", id).Update("strategy_id", nil).Error
}
