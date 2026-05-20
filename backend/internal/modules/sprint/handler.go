package sprint

import (
	"net/http"
	"strconv"

	"github.com/antares-eazy/okr-backend/internal/modules/activitylog"
	"github.com/antares-eazy/okr-backend/internal/shared/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service   *Service
	actLogger *activitylog.Service
}

func NewHandler(service *Service, actLogger *activitylog.Service) *Handler {
	return &Handler{service: service, actLogger: actLogger}
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	sprint, err := h.service.Create(req, userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntitySprint, sprint.ID, sprint.Name)

	response.Success(c, http.StatusCreated, "Sprint created successfully", sprint)
}

func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	sprint, err := h.service.GetByID(uint(id))
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", sprint)
}

func (h *Handler) GetByPeriod(c *gin.Context) {
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

	sprints, err := h.service.GetByPeriod(uint(periodID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch sprints", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", sprints)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	sprint, err := h.service.Update(uint(id), req, userID)
	if err != nil {
		if err.Error() == "sprint not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusUnprocessableEntity, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionUpdate, activitylog.EntitySprint, sprint.ID, sprint.Name)

	response.Success(c, http.StatusOK, "Sprint updated successfully", sprint)
}

func (h *Handler) Activate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	userID := c.GetUint("user_id")
	sprint, err := h.service.Activate(uint(id))
	if err != nil {
		if err.Error() == "sprint not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusUnprocessableEntity, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionActivate, activitylog.EntitySprint, sprint.ID, sprint.Name)

	response.Success(c, http.StatusOK, "Sprint activated successfully", sprint)
}

func (h *Handler) Complete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	var req CompleteRequest
	c.ShouldBindJSON(&req)

	userID := c.GetUint("user_id")
	sprint, err := h.service.Complete(uint(id), req)
	if err != nil {
		if err.Error() == "sprint not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusUnprocessableEntity, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionComplete, activitylog.EntitySprint, sprint.ID, sprint.Name)

	response.Success(c, http.StatusOK, "Sprint completed successfully", sprint)
}

func (h *Handler) GetSprintInitiatives(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	initiatives, err := h.service.GetSprintInitiatives(uint(id))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch sprint initiatives", nil)
		return
	}

	// Return flat array; frontend handles grouping
	response.Success(c, http.StatusOK, "Success", initiatives)
}

func (h *Handler) GetSprintSummary(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	summary, err := h.service.GetSprintSummary(uint(id))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch sprint summary", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", summary)
}

func (h *Handler) GetSprintBacklog(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	backlog, err := h.service.GetSprintBacklog(uint(id))
	if err != nil {
		if err.Error() == "sprint not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to fetch backlog", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", backlog)
}

func (h *Handler) CarryOver(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	var req CarryOverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "initiative_ids is required", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	result, err := h.service.CarryOverInitiatives(uint(id), req.InitiativeIDs, userID)
	if err != nil {
		if err.Error() == "sprint not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		if err.Error() == "no target sprint available for carry-over in this quarter" {
			response.Error(c, http.StatusUnprocessableEntity, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Initiatives carried over successfully", result)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid sprint ID", nil)
		return
	}

	userID := c.GetUint("user_id")
	if err := h.service.Delete(uint(id)); err != nil {
		response.Error(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionDelete, activitylog.EntitySprint, uint(id), "")

	response.Success(c, http.StatusOK, "Sprint deleted successfully", nil)
}
