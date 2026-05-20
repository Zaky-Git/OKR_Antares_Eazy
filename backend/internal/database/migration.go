package database

import (
	"log"

	activitylogModel "github.com/antares-eazy/okr-backend/internal/modules/activitylog"
	authModel "github.com/antares-eazy/okr-backend/internal/modules/auth"
	initiativeModel "github.com/antares-eazy/okr-backend/internal/modules/initiative"
	notificationModel "github.com/antares-eazy/okr-backend/internal/modules/notification"
	objectiveModel "github.com/antares-eazy/okr-backend/internal/modules/objective"
	periodModel "github.com/antares-eazy/okr-backend/internal/modules/period"
	sprintModel "github.com/antares-eazy/okr-backend/internal/modules/sprint"
	keyresultModel "github.com/antares-eazy/okr-backend/internal/modules/keyresult"
)

func Migrate() {
	err := DB.AutoMigrate(
		&authModel.User{},
		&periodModel.Period{},
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
	log.Println("Database migrated successfully")
}
