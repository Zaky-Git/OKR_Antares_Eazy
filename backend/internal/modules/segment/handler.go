package segment

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/antares-eazy/okr-backend/internal/modules/activitylog"
	"github.com/antares-eazy/okr-backend/internal/shared/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc       *Service
	actLogger *activitylog.Service
}

func NewHandler(svc *Service, actLogger *activitylog.Service) *Handler {
	return &Handler{svc: svc, actLogger: actLogger}
}

const entitySegment = "SEGMENT"

func (h *Handler) List(c *gin.Context) {
	if c.Query("page") == "" && c.Query("limit") == "" && c.Query("search") == "" {
		items, err := h.svc.List()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "Failed to fetch segments", nil)
			return
		}
		response.Success(c, http.StatusOK, "Success", items)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	items, total, err := h.svc.ListPaginated(page, limit, search)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch segments", nil)
		return
	}

	totalPages := total / int64(limit)
	if total%int64(limit) != 0 {
		totalPages++
	}

	response.SuccessWithPagination(c, http.StatusOK, "Success", items, response.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid segment ID", nil)
		return
	}
	item, err := h.svc.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			response.Error(c, http.StatusNotFound, "Segment not found", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to fetch segment", nil)
		return
	}
	response.Success(c, http.StatusOK, "Success", item)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	item, fieldErrs, err := h.svc.Create(req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create segment", nil)
		return
	}
	if fieldErrs != nil {
		if v, ok := fieldErrs["name"]; ok && v == "Name already exists" {
			response.Error(c, http.StatusUnprocessableEntity, "Name already exists", fieldErrs)
			return
		}
		response.Error(c, http.StatusBadRequest, "Validation failed", fieldErrs)
		return
	}
	userID := c.GetUint("user_id")
	h.actLogger.Log(userID, activitylog.ActionCreate, entitySegment, item.ID, item.Name)
	response.Success(c, http.StatusCreated, "Segment created", item)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid segment ID", nil)
		return
	}
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	item, fieldErrs, err := h.svc.Update(uint(id), req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			response.Error(c, http.StatusNotFound, "Segment not found", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to update segment", nil)
		return
	}
	if fieldErrs != nil {
		if v, ok := fieldErrs["name"]; ok && v == "Name already exists" {
			response.Error(c, http.StatusUnprocessableEntity, "Name already exists", fieldErrs)
			return
		}
		response.Error(c, http.StatusBadRequest, "Validation failed", fieldErrs)
		return
	}
	userID := c.GetUint("user_id")
	h.actLogger.Log(userID, activitylog.ActionUpdate, entitySegment, item.ID, item.Name)
	response.Success(c, http.StatusOK, "Segment updated", item)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid segment ID", nil)
		return
	}
	item, _ := h.svc.GetByID(uint(id))
	title := ""
	if item != nil {
		title = item.Name
	}
	if err := h.svc.Delete(uint(id)); err != nil {
		if errors.Is(err, ErrNotFound) {
			response.Error(c, http.StatusNotFound, "Segment not found", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to delete segment", nil)
		return
	}
	userID := c.GetUint("user_id")
	h.actLogger.Log(userID, activitylog.ActionDelete, entitySegment, uint(id), title)
	response.Success(c, http.StatusOK, "Segment deleted", nil)
}
