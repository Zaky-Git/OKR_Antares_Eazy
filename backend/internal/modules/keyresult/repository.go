package keyresult

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(kr *KeyResult) error {
	return r.db.Create(kr).Error
}

func (r *Repository) FindByID(id uint) (*KeyResult, error) {
	var kr KeyResult
	err := r.db.First(&kr, id).Error
	if err != nil {
		return nil, err
	}
	return &kr, nil
}

func (r *Repository) FindByObjectiveID(objectiveID uint) ([]KeyResult, error) {
	var krs []KeyResult
	err := r.db.Where("objective_id = ?", objectiveID).Find(&krs).Error
	return krs, err
}

func (r *Repository) Update(kr *KeyResult) error {
	return r.db.Save(kr).Error
}

func (r *Repository) SoftDelete(id uint) error {
	return r.db.Delete(&KeyResult{}, id).Error
}

func (r *Repository) UpdateProgress(id uint, progress float64) error {
	return r.db.Model(&KeyResult{}).Where("id = ?", id).Update("progress", progress).Error
}
