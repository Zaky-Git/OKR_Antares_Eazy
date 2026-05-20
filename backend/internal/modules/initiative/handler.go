package initiative

import (
	"fmt"
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
	keyResultID, err := strconv.ParseUint(c.Param("key_result_id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid key result ID", nil)
		return
	}

	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	init, err := h.service.Create(uint(keyResultID), req, userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntityInitiative, init.ID, init.Title,
		activitylog.WithKeyResultID(uint(keyResultID)),
		activitylog.WithInitiativeID(init.ID))

	response.Success(c, http.StatusCreated, "Initiative created successfully", init)
}

func (h *Handler) CreateChild(c *gin.Context) {
	parentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid initiative ID", nil)
		return
	}

	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	init, err := h.service.CreateChild(uint(parentID), req, userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntityInitiative, init.ID, init.Title,
		activitylog.WithInitiativeID(init.ID),
		activitylog.WithDescription(fmt.Sprintf("membuat sub-initiative \"%s\"", init.Title)))

	response.Success(c, http.StatusCreated, "Child initiative created successfully", init)
}

func (h *Handler) GetTree(c *gin.Context) {
	keyResultID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid key result ID", nil)
		return
	}

	tree, err := h.service.GetTree(uint(keyResultID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch initiative tree", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", tree)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid initiative ID", nil)
		return
	}

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	init, err := h.service.Update(uint(id), req, userID)
	if err != nil {
		if err.Error() == "forbidden" {
			response.Error(c, http.StatusForbidden, "You are not the owner/assignee of this initiative", nil)
			return
		}
		if err.Error() == "initiative not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}


	if req.Status != nil {
		h.actLogger.Log(userID, activitylog.ActionStatusChange, activitylog.EntityInitiative, init.ID, init.Title,
			activitylog.WithInitiativeID(init.ID),
			activitylog.WithNewValue(*req.Status),
			activitylog.WithDescription(fmt.Sprintf("mengubah status initiative \"%s\" ke %s", init.Title, *req.Status)))
	} else if req.AssigneeID != nil {
		h.actLogger.Log(userID, activitylog.ActionAssign, activitylog.EntityInitiative, init.ID, init.Title,
			activitylog.WithInitiativeID(init.ID),
			activitylog.WithDescription(fmt.Sprintf("meng-assign initiative \"%s\"", init.Title)))
	} else {
		h.actLogger.Log(userID, activitylog.ActionUpdate, activitylog.EntityInitiative, init.ID, init.Title,
			activitylog.WithInitiativeID(init.ID))
	}

	response.Success(c, http.StatusOK, "Initiative updated successfully", init)
}

func (h *Handler) UpdateProgress(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid initiative ID", nil)
		return
	}

	var req ProgressUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	init, err := h.service.UpdateProgress(uint(id), req, userID)
	if err != nil {
		if err.Error() == "forbidden" {
			response.Error(c, http.StatusForbidden, "You are not the owner/assignee", nil)
			return
		}
		if err.Error() == "cannot manually update progress for parent initiative" {
			response.Error(c, http.StatusUnprocessableEntity, err.Error(), nil)
			return
		}
		if err.Error() == "initiative not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionProgressUpdate, activitylog.EntityInitiative, init.ID, init.Title,
		activitylog.WithInitiativeID(init.ID),
		activitylog.WithOldValue(fmt.Sprintf("%.0f%%", req.Progress)),
		activitylog.WithNewValue(fmt.Sprintf("%.0f%%", init.Progress)),
		activitylog.WithDescription(fmt.Sprintf("mengubah progress initiative \"%s\" ke %.0f%%", init.Title, init.Progress)))

	response.Success(c, http.StatusOK, "Progress updated successfully", init)
}

func (h *Handler) GetMyActiveSprintInitiatives(c *gin.Context) {
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

	userID := c.GetUint("user_id")
	initiatives, sprintID, err := h.service.GetMyInitiativesInActiveSprint(uint(periodID), userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch initiatives", nil)
		return
	}

	result := map[string]interface{}{
		"sprint_id":   sprintID,
		"initiatives": initiatives,
	}

	response.Success(c, http.StatusOK, "Success", result)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid initiative ID", nil)
		return
	}

	userID := c.GetUint("user_id")
	if err := h.service.Delete(uint(id), userID); err != nil {
		if err.Error() == "forbidden" {
			response.Error(c, http.StatusForbidden, "You are not the owner/assignee", nil)
			return
		}
		response.Error(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionDelete, activitylog.EntityInitiative, uint(id), "",
		activitylog.WithInitiativeID(uint(id)))

	response.Success(c, http.StatusOK, "Initiative deleted successfully", nil)
}
