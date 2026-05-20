package database

import (
	"log"

	activitylogModel "github.com/antares-eazy/okr-backend/internal/modules/activitylog"
	authModel "github.com/antares-eazy/okr-backend/internal/modules/auth"
	divisionModel "github.com/antares-eazy/okr-backend/internal/modules/division"
	initiativeModel "github.com/antares-eazy/okr-backend/internal/modules/initiative"
	keyresultModel "github.com/antares-eazy/okr-backend/internal/modules/keyresult"
	notificationModel "github.com/antares-eazy/okr-backend/internal/modules/notification"
	objectiveModel "github.com/antares-eazy/okr-backend/internal/modules/objective"
	periodModel "github.com/antares-eazy/okr-backend/internal/modules/period"
	segmentModel "github.com/antares-eazy/okr-backend/internal/modules/segment"
	sprintModel "github.com/antares-eazy/okr-backend/internal/modules/sprint"
	strategyModel "github.com/antares-eazy/okr-backend/internal/modules/strategy"
)

func Migrate() {
	err := DB.AutoMigrate(
		&authModel.User{},
		&periodModel.Period{},
		// Master data tables (strategies, segments, divisions)
		&strategyModel.Strategy{},
		&segmentModel.Segment{},
		&divisionModel.Division{},
		&sprintModel.Sprint{},
		&objectiveModel.Objective{},
		&keyresultModel.KeyResult{},
		&initiativeModel.Initiative{},
		&initiativeModel.InitiativeUpdate{},
		&notificationModel.Notification{},
		&notificationModel.NotificationLog{},
		&activitylogModel.ActivityLog{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Backfill kr_type for existing records (idempotent)
	DB.Exec("UPDATE key_results SET kr_type = 'METRIC' WHERE kr_type IS NULL OR kr_type = ''")

	log.Println("Database migrated successfully")
}
