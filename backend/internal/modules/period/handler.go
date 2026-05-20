package period

import (
	"net/http"

	"github.com/antares-eazy/okr-backend/internal/shared/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetAll(c *gin.Context) {
	periods, err := h.service.GetAllPeriods()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch periods", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", periods)
}

func (h *Handler) GetCurrent(c *gin.Context) {
	period, err := h.service.GetCurrentPeriod()
	if err != nil {
		response.Error(c, http.StatusNotFound, "Current period not found", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", period)
}

func (h *Handler) EnsureCurrentYear(c *gin.Context) {
	periods, err := h.service.EnsureCurrentYear()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to ensure periods", nil)
		return
	}

	response.Success(c, http.StatusOK, "Periods ensured for current year", periods)
}

func (h *Handler) EnsureYear(c *gin.Context) {
	var req struct {
		Year int `json:"year"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Year == 0 {
		response.Error(c, http.StatusBadRequest, "year is required", nil)
		return
	}

	periods, err := h.service.EnsureYear(req.Year)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to ensure periods", nil)
		return
	}

	response.Success(c, http.StatusOK, "Periods ensured", periods)
}
