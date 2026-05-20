package keyresult

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
	kr, err := h.service.Create(uint(objectiveID), req, userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntityKeyResult, kr.ID, kr.Title,
		activitylog.WithObjectiveID(uint(objectiveID)),
		activitylog.WithKeyResultID(kr.ID))

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
	kr, err := h.service.Update(uint(id), req, userID)
	if err != nil {
		if err.Error() == "forbidden" {
			response.Error(c, http.StatusForbidden, "You are not the owner of this key result", nil)
			return
		}
		if err.Error() == "key result not found" {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionUpdate, activitylog.EntityKeyResult, kr.ID, kr.Title,
		activitylog.WithObjectiveID(kr.ObjectiveID),
		activitylog.WithKeyResultID(kr.ID))

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
		if err.Error() == "forbidden" {
			response.Error(c, http.StatusForbidden, "You are not the owner of this key result", nil)
			return
		}
		response.Error(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionDelete, activitylog.EntityKeyResult, uint(id), "",
		activitylog.WithKeyResultID(uint(id)))

	response.Success(c, http.StatusOK, "Key result deleted successfully", nil)
}
