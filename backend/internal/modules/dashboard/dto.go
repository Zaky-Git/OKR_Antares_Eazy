package dashboard

import "github.com/antares-eazy/okr-backend/internal/modules/initiative"

type DashboardResponse struct {
	TotalObjectives    int64                        `json:"total_objectives"`
	AvgProgress        float64                      `json:"avg_progress"`
	OnTrack            int64                        `json:"on_track"`
	AtRisk             int64                        `json:"at_risk"`
	OffTrack           int64                        `json:"off_track"`
	OverdueInitiatives int64                        `json:"overdue_initiatives"`
	RecentUpdates      []initiative.InitiativeUpdate `json:"recent_updates"`
}

type AnnualDashboardResponse struct {
	Year          int              `json:"year"`
	AnnualSummary AnnualSummary    `json:"annual_summary"`
	Quarters      []QuarterSummary `json:"quarters"`
}

type AnnualSummary struct {
	TotalObjectives     int64   `json:"total_objectives"`
	AvgProgress         float64 `json:"avg_progress"`
	CompletedObjectives int64   `json:"completed_objectives"`
	CompletionRate      float64 `json:"completion_rate"`
	TotalInitiatives    int64   `json:"total_initiatives"`
	TotalOverdue        int64   `json:"total_overdue"`
}

type QuarterSummary struct {
	Quarter     string  `json:"quarter"`
	PeriodID    uint    `json:"period_id"`
	TotalObj    int64   `json:"total_objectives"`
	AvgProgress float64 `json:"avg_progress"`
	OnTrack     int64   `json:"on_track"`
	AtRisk      int64   `json:"at_risk"`
	OffTrack    int64   `json:"off_track"`
	Done        int64   `json:"done"`
}

type ActivityItem struct {
	ID           uint    `json:"id"`
	UserID       uint    `json:"user_id"`
	UserName     string  `json:"user_name"`
	Action       string  `json:"action"`
	EntityType   string  `json:"entity_type"`
	EntityID     uint    `json:"entity_id"`
	EntityTitle  string  `json:"entity_title"`
	Description  string  `json:"description"`
	OldValue     *string `json:"old_value"`
	NewValue     *string `json:"new_value"`
	ObjectiveID  *uint   `json:"objective_id"`
	KeyResultID  *uint   `json:"key_result_id"`
	InitiativeID *uint   `json:"initiative_id"`
	CreatedAt    string  `json:"created_at"`
}
