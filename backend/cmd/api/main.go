package main

import (
	"fmt"
	"log"

	"github.com/antares-eazy/okr-backend/internal/config"
	"github.com/antares-eazy/okr-backend/internal/database"
	"github.com/antares-eazy/okr-backend/internal/middleware"
	"github.com/antares-eazy/okr-backend/internal/routes"
	"github.com/gin-gonic/gin"
)

func main() {

	cfg := config.Load()


	database.Connect(cfg)


	database.Migrate()


	r := gin.Default()
	r.Use(middleware.CORSMiddleware())


	routes.Setup(r, database.GetDB(), cfg)


	addr := fmt.Sprintf(":%s", cfg.AppPort)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
