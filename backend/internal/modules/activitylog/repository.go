package activitylog

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(log *ActivityLog) error {
	return r.db.Create(log).Error
}

func (r *Repository) CreateWithTx(tx *gorm.DB, log *ActivityLog) error {
	return tx.Create(log).Error
}

func (r *Repository) GetDB() *gorm.DB {
	return r.db
}
