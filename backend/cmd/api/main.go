package main

import (
	"fmt"
	"log"

	"github.com/antares-eazy/okr-backend/internal/config"
	"github.com/antares-eazy/okr-backend/internal/database"
	"github.com/antares-eazy/okr-backend/internal/middleware"
	"github.com/antares-eazy/okr-backend/internal/modules/period"
	"github.com/antares-eazy/okr-backend/internal/routes"
	"github.com/antares-eazy/okr-backend/internal/shared/seeder"
	"github.com/gin-gonic/gin"
)

func main() {

	cfg := config.Load()


	database.Connect(cfg)


	database.Migrate()

	periodRepo := period.NewRepository(database.GetDB())
	periodService := period.NewService(periodRepo)
	periodService.EnsureCurrentYear()
	log.Println("Periods ensured for current year")

	// Seed master data (Strategy, Segment, Division) — idempotent
	if summary, err := seeder.SeedMasters(database.GetDB()); err != nil {
		log.Printf("Master seeder error: %v", err)
	} else {
		log.Printf("Master seeder ran: strategies=%d segments=%d divisions=%d", summary.Strategies, summary.Segments, summary.Divisions)
	}


	r := gin.Default()
	r.Use(middleware.CORSMiddleware())


	routes.Setup(r, database.GetDB(), cfg)


	addr := fmt.Sprintf(":%s", cfg.AppPort)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
