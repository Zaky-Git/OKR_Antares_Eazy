package objective

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/antares-eazy/okr-backend/internal/modules/activitylog"
	"github.com/antares-eazy/okr-backend/internal/shared/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service    *Service
	actLogger  *activitylog.Service
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
	obj, err := h.service.Create(req, userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}


	h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntityObjective, obj.ID, obj.Title,
		activitylog.WithObjectiveID(obj.ID))

	response.Success(c, http.StatusCreated, "Objective created successfully", obj)
}

func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid objective ID", nil)
		return
	}

	obj, err := h.service.GetByID(uint(id))
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", obj)
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

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	objectives, total, err := h.service.GetByPeriod(uint(periodID), page, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch objectives", nil)
		return
	}

	totalPages := total / int64(limit)
	if total%int64(limit) != 0 {
		totalPages++
	}

	response.SuccessWithPagination(c, http.StatusOK, "Success", objectives, response.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid objective ID", nil)
		return
	}

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}


	oldObj, _ := h.service.GetByID(uint(id))

	userID := c.GetUint("user_id")
	obj, err := h.service.Update(uint(id), req, userID)
	if err != nil {
		if err.Error() == "forbidden" {
			response.Error(c, http.StatusForbidden, "You are not the owner of this objective", nil)
			return
		}
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}


	if req.Status != nil && oldObj != nil && *req.Status != oldObj.Status {
		h.actLogger.Log(userID, activitylog.ActionStatusChange, activitylog.EntityObjective, obj.ID, obj.Title,
			activitylog.WithObjectiveID(obj.ID),
			activitylog.WithOldValue(oldObj.Status),
			activitylog.WithNewValue(*req.Status),
			activitylog.WithDescription(fmt.Sprintf("mengubah status objective \"%s\" dari %s ke %s", obj.Title, oldObj.Status, *req.Status)))
	} else {
		h.actLogger.Log(userID, activitylog.ActionUpdate, activitylog.EntityObjective, obj.ID, obj.Title,
			activitylog.WithObjectiveID(obj.ID))
	}

	response.Success(c, http.StatusOK, "Objective updated successfully", obj)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid objective ID", nil)
		return
	}


	obj, _ := h.service.GetByID(uint(id))
	title := ""
	if obj != nil {
		title = obj.Title
	}

	userID := c.GetUint("user_id")
	if err := h.service.Delete(uint(id), userID); err != nil {
		if err.Error() == "forbidden" {
			response.Error(c, http.StatusForbidden, "You are not the owner of this objective", nil)
			return
		}
		response.Error(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	h.actLogger.Log(userID, activitylog.ActionDelete, activitylog.EntityObjective, uint(id), title,
		activitylog.WithObjectiveID(uint(id)))

	response.Success(c, http.StatusOK, "Objective deleted successfully", nil)
}

func (h *Handler) Reorder(c *gin.Context) {
	var req struct {
		Orders []struct {
			ID        uint `json:"id"`
			SortOrder int  `json:"sort_order"`
		} `json:"orders"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	if err := h.service.Reorder(req.Orders); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to reorder", nil)
		return
	}

	response.Success(c, http.StatusOK, "Reordered successfully", nil)
}
