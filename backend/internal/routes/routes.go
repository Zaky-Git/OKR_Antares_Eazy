package routes

import (
	"github.com/antares-eazy/okr-backend/internal/config"
	"github.com/antares-eazy/okr-backend/internal/middleware"
	"github.com/antares-eazy/okr-backend/internal/modules/activitylog"
	"github.com/antares-eazy/okr-backend/internal/modules/auth"
	"github.com/antares-eazy/okr-backend/internal/modules/dashboard"
	"github.com/antares-eazy/okr-backend/internal/modules/initiative"
	"github.com/antares-eazy/okr-backend/internal/modules/keyresult"
	"github.com/antares-eazy/okr-backend/internal/modules/notification"
	"github.com/antares-eazy/okr-backend/internal/modules/objective"
	"github.com/antares-eazy/okr-backend/internal/modules/period"
	"github.com/antares-eazy/okr-backend/internal/modules/sprint"
	"github.com/antares-eazy/okr-backend/internal/ws"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(r *gin.Engine, db *gorm.DB, cfg *config.Config) {

	hub := ws.NewHub()
	go hub.Run()


	authRepo := auth.NewRepository(db)
	periodRepo := period.NewRepository(db)
	sprintRepo := sprint.NewRepository(db)
	objectiveRepo := objective.NewRepository(db)
	krRepo := keyresult.NewRepository(db)
	initiativeRepo := initiative.NewRepository(db)
	notificationRepo := notification.NewRepository(db)
	activityRepo := activitylog.NewRepository(db)


	authService := auth.NewService(authRepo, cfg)
	periodService := period.NewService(periodRepo)
	activityService := activitylog.NewService(activityRepo, hub)
	sprintService := sprint.NewService(sprintRepo, periodRepo, activityService)
	objectiveService := objective.NewService(objectiveRepo)
	krService := keyresult.NewService(krRepo)
	initiativeService := initiative.NewService(initiativeRepo, krRepo, objectiveRepo)
	notificationService := notification.NewService(notificationRepo, initiativeRepo)
	dashboardService := dashboard.NewService(db)


	authHandler := auth.NewHandler(authService)
	periodHandler := period.NewHandler(periodService)
	sprintHandler := sprint.NewHandler(sprintService, activityService)
	objectiveHandler := objective.NewHandler(objectiveService, activityService)
	krHandler := keyresult.NewHandler(krService, activityService)
	initiativeHandler := initiative.NewHandler(initiativeService, activityService)
	notificationHandler := notification.NewHandler(notificationService)
	dashboardHandler := dashboard.NewHandler(dashboardService)


	api := r.Group("/api")


	api.GET("/ws", ws.HandleWS(hub))


	authGroup := api.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
	}


	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg))
	{

		protected.GET("/auth/me", authHandler.Me)
		protected.GET("/users", authHandler.GetAllUsers)


		protected.GET("/periods", periodHandler.GetAll)
		protected.GET("/periods/current", periodHandler.GetCurrent)
		protected.POST("/periods/ensure-current-year", periodHandler.EnsureCurrentYear)
		protected.POST("/periods/ensure-year", periodHandler.EnsureYear)


		protected.GET("/sprints", sprintHandler.GetByPeriod)
		protected.POST("/sprints", sprintHandler.Create)
		protected.GET("/sprints/:id", sprintHandler.GetByID)
		protected.PATCH("/sprints/:id", sprintHandler.Update)
		protected.PATCH("/sprints/:id/activate", sprintHandler.Activate)
		protected.PATCH("/sprints/:id/complete", sprintHandler.Complete)
		protected.GET("/sprints/:id/initiatives", sprintHandler.GetSprintInitiatives)
		protected.GET("/sprints/:id/summary", sprintHandler.GetSprintSummary)
		protected.GET("/sprints/:id/backlog", sprintHandler.GetSprintBacklog)
		protected.POST("/sprints/:id/carry-over", sprintHandler.CarryOver)
		protected.DELETE("/sprints/:id", sprintHandler.Delete)


		protected.GET("/objectives", objectiveHandler.GetByPeriod)
		protected.POST("/objectives", objectiveHandler.Create)
		protected.GET("/objectives/:id", objectiveHandler.GetByID)
		protected.PATCH("/objectives/:id", objectiveHandler.Update)
		protected.DELETE("/objectives/:id", objectiveHandler.Delete)
		protected.PUT("/objectives-reorder", objectiveHandler.Reorder)


		protected.GET("/objectives/:id/key-results", krHandler.GetByObjective)
		protected.POST("/objectives/:id/key-results", krHandler.Create)
		protected.PATCH("/key-results/:id", krHandler.Update)
		protected.DELETE("/key-results/:id", krHandler.Delete)


		protected.GET("/initiatives/my-active-sprint", initiativeHandler.GetMyActiveSprintInitiatives)
		protected.POST("/key-results/:key_result_id/initiatives", initiativeHandler.Create)
		protected.POST("/initiatives/:id/children", initiativeHandler.CreateChild)
		protected.GET("/key-results/:id/initiative-tree", initiativeHandler.GetTree)
		protected.PATCH("/initiatives/:id", initiativeHandler.Update)
		protected.PATCH("/initiatives/:id/progress", initiativeHandler.UpdateProgress)
		protected.PATCH("/initiatives/:id/assign-sprint", initiativeHandler.AssignSprint)
		protected.DELETE("/initiatives/:id", initiativeHandler.Delete)


		protected.GET("/notifications", notificationHandler.GetNotifications)
		protected.GET("/notifications/unread-count", notificationHandler.GetUnreadCount)
		protected.PATCH("/notifications/:id/read", notificationHandler.MarkRead)
		protected.PATCH("/notifications/read-all", notificationHandler.MarkAllRead)
		protected.POST("/notifications/check-due-initiatives", notificationHandler.CheckDueInitiatives)


		protected.GET("/dashboard", dashboardHandler.GetDashboard)
		protected.GET("/dashboard/annual", dashboardHandler.GetAnnualDashboard)
		protected.GET("/search", dashboardHandler.Search)
		protected.GET("/logs", dashboardHandler.GetActivities)
	}
}
