package keyresult

import (
	"errors"
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

func (h *Handler) GetByObjective(c *gin.Context) {
	objectiveID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid objective ID", nil)
		return
	}

	krs, err := h.service.GetByObjectiveID(uint(objectiveID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch key results", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", krs)
}

func (h *Handler) Create(c *gin.Context) {
	objectiveID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid objective ID", nil)
		return
	}

	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	kr, validationErrors, err := h.service.Create(uint(objectiveID), req, userID)
	if err != nil {
		if validationErrors != nil {
			response.Error(c, http.StatusBadRequest, "Validation failed", validationErrors)
			return
		}
		response.Error(c, http.StatusInternalServerError, err.Error(), nil)
		return
	}

	// Activity log with new fields
	newValue := map[string]interface{}{
		"kr_type":        kr.KRType,
		"target_value":   kr.TargetValue,
		"current_value":  kr.CurrentValue,
		"baseline_value": kr.BaselineValue,
	}
	if kr.DueDate != nil {
		newValue["due_date"] = *kr.DueDate
	}
	if kr.Notes != nil {
		newValue["notes"] = *kr.Notes
	}

	h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntityKeyResult, kr.ID, kr.Title,
		activitylog.WithObjectiveID(uint(objectiveID)),
		activitylog.WithKeyResultID(kr.ID),
		activitylog.WithNewValue(ToJSONString(newValue)))

	response.Success(c, http.StatusCreated, "Key result created successfully", kr)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid key result ID", nil)
		return
	}

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	kr, oldDelta, newDelta, validationErrors, err := h.service.Update(uint(id), req, userID)
	if err != nil {
		if validationErrors != nil {
			response.Error(c, http.StatusBadRequest, "Validation failed", validationErrors)
			return
		}
		if errors.Is(err, ErrForbidden) {
			response.Error(c, http.StatusForbidden, "You are not the owner of this key result", nil)
			return
		}
		if errors.Is(err, ErrNotFound) {
			response.Error(c, http.StatusNotFound, "Key result not found", nil)
			return
		}
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	// Activity log with delta diff
	opts := []activitylog.LogOption{
		activitylog.WithObjectiveID(kr.ObjectiveID),
		activitylog.WithKeyResultID(kr.ID),
	}
	if len(oldDelta) > 0 {
		opts = append(opts, activitylog.WithOldValue(ToJSONString(oldDelta)))
	}
	if len(newDelta) > 0 {
		opts = append(opts, activitylog.WithNewValue(ToJSONString(newDelta)))
	}

	h.actLogger.Log(userID, activitylog.ActionUpdate, activitylog.EntityKeyResult, kr.ID, kr.Title, opts...)

	response.Success(c, http.StatusOK, "Key result updated successfully", kr)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid key result ID", nil)
		return
	}

	userID := c.GetUint("user_id")
	if err := h.service.Delete(uint(id), userID); err != nil {
		if errors.Is(err, ErrForbidden) {
			response.Error(c, http.StatusForbidden, "You are not the owner of this key result", nil)
			return
		}
		response.Error(c, http.StatusNotFound, "Key result not found", nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionDelete, activitylog.EntityKeyResult, uint(id), "",
		activitylog.WithKeyResultID(uint(id)))

	response.Success(c, http.StatusOK, "Key result deleted successfully", nil)
}

func (h *Handler) ToggleMilestone(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid key result ID", nil)
		return
	}

	userID := c.GetUint("user_id")
	kr, oldFields, newFields, err := h.service.ToggleMilestone(uint(id), userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			response.Error(c, http.StatusNotFound, "Key result not found", nil)
			return
		}
		if errors.Is(err, ErrForbidden) {
			response.Error(c, http.StatusForbidden, "Anda tidak punya izin untuk mengubah milestone ini", nil)
			return
		}
		if errors.Is(err, ErrNotMilestone) {
			response.Error(c, http.StatusUnprocessableEntity, "Cannot toggle milestone on METRIC key result", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to toggle milestone", nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionStatusChange, activitylog.EntityKeyResult, kr.ID, kr.Title,
		activitylog.WithObjectiveID(kr.ObjectiveID),
		activitylog.WithKeyResultID(kr.ID),
		activitylog.WithOldValue(ToJSONString(oldFields)),
		activitylog.WithNewValue(ToJSONString(newFields)))

	response.Success(c, http.StatusOK, "Milestone toggled", kr)
}
