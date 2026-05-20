package notification

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(n *Notification) error {
	return r.db.Create(n).Error
}

func (r *Repository) FindByUserID(userID uint, page, limit int) ([]Notification, int64, error) {
	var notifications []Notification
	var total int64

	query := r.db.Where("user_id = ?", userID)
	query.Model(&Notification{}).Count(&total)

	offset := (page - 1) * limit
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&notifications).Error
	return notifications, total, err
}

func (r *Repository) CountUnread(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count).Error
	return count, err
}

func (r *Repository) MarkRead(id uint, userID uint) error {
	return r.db.Model(&Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(map[string]interface{}{"is_read": true, "read_at": gorm.Expr("NOW()")}).Error
}

func (r *Repository) MarkAllRead(userID uint) error {
	return r.db.Model(&Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{"is_read": true, "read_at": gorm.Expr("NOW()")}).Error
}

func (r *Repository) LogExists(initiativeID, userID uint, reminderKey string) (bool, error) {
	var count int64
	err := r.db.Model(&NotificationLog{}).
		Where("initiative_id = ? AND user_id = ? AND reminder_key = ?", initiativeID, userID, reminderKey).
		Count(&count).Error
	return count > 0, err
}

func (r *Repository) CreateLog(log *NotificationLog) error {
	return r.db.Create(log).Error
}

func (r *Repository) GetDB() *gorm.DB {
	return r.db
}
