package dashboard

import (
	"net/http"
	"strconv"

	"github.com/antares-eazy/okr-backend/internal/shared/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetDashboard(c *gin.Context) {
	periodIDStr := c.Query("period_id")
	if periodIDStr == "" {
		response.Error(c, http.StatusBadRequest, "period_id is required", nil)
		return
	}

	periodID, err := strconv.ParseUint(periodIDStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid period_id", nil)
		return
	}

	dashboard, err := h.service.GetDashboard(uint(periodID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch dashboard", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", dashboard)
}

func (h *Handler) GetAnnualDashboard(c *gin.Context) {
	yearStr := c.Query("year")
	if yearStr == "" {
		response.Error(c, http.StatusBadRequest, "year is required", nil)
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid year", nil)
		return
	}

	dashboard, err := h.service.GetAnnualDashboard(year)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch annual dashboard", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", dashboard)
}

func (h *Handler) GetActivities(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	activities, total, err := h.service.GetActivities(page, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch activities", nil)
		return
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)
	response.SuccessWithPagination(c, http.StatusOK, "Success", activities, response.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	})
}
