package sprint

import (
	"gorm.io/gorm"
)

// SprintInitiativeRow represents a raw query result for initiatives with parent context
type SprintInitiativeRow struct {
	ID             uint    `json:"id"`
	KeyResultID    uint    `json:"key_result_id"`
	SprintID       *uint   `json:"sprint_id"`
	ParentID       *uint   `json:"parent_id"`
	Title          string  `json:"title"`
	Description    *string `json:"description"`
	AssigneeID     *uint   `json:"assignee_id"`
	AssigneeName   *string `json:"assignee_name"`
	Progress       float64 `json:"progress"`
	Status         string  `json:"status"`
	DueDate        *string `json:"due_date"`
	ObjectiveTitle string  `json:"objective_title"`
	KeyResultTitle string  `json:"key_result_title"`
	CreatedBy      uint    `json:"created_by"`
}

// SprintSummaryRow represents a raw query result for sprint summary aggregation
type SprintSummaryRow struct {
	TotalInitiatives int     `json:"total_initiatives"`
	TodoCount        int     `json:"todo_count"`
	InProgressCount  int     `json:"in_progress_count"`
	BlockedCount     int     `json:"blocked_count"`
	DoneCount        int     `json:"done_count"`
	CancelledCount   int     `json:"cancelled_count"`
	SprintProgress   float64 `json:"sprint_progress"`
}

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

// GetSprintInitiatives returns all initiatives for a sprint with parent objective/KR context and assignee name
func (r *Repository) GetSprintInitiatives(sprintID uint) ([]SprintInitiativeRow, error) {
	var rows []SprintInitiativeRow
	err := r.db.Raw(`
		SELECT 
			i.id,
			i.key_result_id,
			i.sprint_id,
			i.parent_id,
			i.title,
			i.description,
			i.assignee_id,
			u.name AS assignee_name,
			i.progress,
			i.status,
			DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
			o.title AS objective_title,
			kr.title AS key_result_title,
			i.created_by
		FROM initiatives i
		JOIN key_results kr ON kr.id = i.key_result_id AND kr.deleted_at IS NULL
		JOIN objectives o ON o.id = kr.objective_id AND o.deleted_at IS NULL
		LEFT JOIN users u ON u.id = i.assignee_id AND u.deleted_at IS NULL
		WHERE i.sprint_id = ? AND i.deleted_at IS NULL
		ORDER BY i.status, i.title
	`, sprintID).Scan(&rows).Error
	return rows, err
}

// GetSprintSummary returns aggregate counts by status and average progress for root-level initiatives
func (r *Repository) GetSprintSummary(sprintID uint) (*SprintSummaryRow, error) {
	var row SprintSummaryRow
	err := r.db.Raw(`
		SELECT
			COUNT(*) AS total_initiatives,
			SUM(CASE WHEN status = 'TODO' THEN 1 ELSE 0 END) AS todo_count,
			SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_count,
			SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked_count,
			SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS done_count,
			SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count,
			COALESCE(AVG(CASE WHEN parent_id IS NULL THEN progress END), 0) AS sprint_progress
		FROM initiatives
		WHERE sprint_id = ? AND deleted_at IS NULL
	`, sprintID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// GetBacklogInitiatives returns initiatives without a sprint assignment in the same period
func (r *Repository) GetBacklogInitiatives(periodID uint) ([]SprintInitiativeRow, error) {
	var rows []SprintInitiativeRow
	err := r.db.Raw(`
		SELECT 
			i.id,
			i.key_result_id,
			i.sprint_id,
			i.parent_id,
			i.title,
			i.description,
			i.assignee_id,
			u.name AS assignee_name,
			i.progress,
			i.status,
			DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
			o.title AS objective_title,
			kr.title AS key_result_title,
			i.created_by
		FROM initiatives i
		JOIN key_results kr ON kr.id = i.key_result_id AND kr.deleted_at IS NULL
		JOIN objectives o ON o.id = kr.objective_id AND o.deleted_at IS NULL
		LEFT JOIN users u ON u.id = i.assignee_id AND u.deleted_at IS NULL
		WHERE i.sprint_id IS NULL
			AND i.deleted_at IS NULL
			AND o.period_id = ?
		ORDER BY i.status, i.title
	`, periodID).Scan(&rows).Error
	return rows, err
}

// FindNextPlanningSprintInPeriod finds the next PLANNING sprint in the same period, excluding a specific sprint
func (r *Repository) FindNextPlanningSprintInPeriod(periodID uint, excludeSprintID uint) (*Sprint, error) {
	var s Sprint
	err := r.db.Where("period_id = ? AND status = ? AND id != ?", periodID, "PLANNING", excludeSprintID).
		Order("start_date ASC").
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// UpdateInitiativeSprintID updates the sprint_id of a specific initiative
func (r *Repository) UpdateInitiativeSprintID(initiativeID uint, targetSprintID uint) error {
	return r.db.Exec("UPDATE initiatives SET sprint_id = ? WHERE id = ? AND deleted_at IS NULL", targetSprintID, initiativeID).Error
}

// GetInitiativeTitle returns the title of an initiative by ID
func (r *Repository) GetInitiativeTitle(initiativeID uint) (string, error) {
	var title string
	err := r.db.Raw("SELECT title FROM initiatives WHERE id = ? AND deleted_at IS NULL", initiativeID).Scan(&title).Error
	return title, err
}
