package division

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

const entityDivision = "DIVISION"

func (h *Handler) List(c *gin.Context) {
	if c.Query("page") == "" && c.Query("limit") == "" && c.Query("search") == "" {
		items, err := h.svc.List()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "Failed to fetch divisions", nil)
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
		response.Error(c, http.StatusInternalServerError, "Failed to fetch divisions", nil)
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
		response.Error(c, http.StatusBadRequest, "Invalid division ID", nil)
		return
	}
	item, err := h.svc.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			response.Error(c, http.StatusNotFound, "Division not found", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to fetch division", nil)
		return
	}
	response.Success(c, http.StatusOK, "Success", item)
}

func isDuplicate(fe FieldErrors) bool {
	if v, ok := fe["name"]; ok && v == "Name already exists" {
		return true
	}
	if v, ok := fe["code"]; ok && v == "Code already exists" {
		return true
	}
	return false
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	item, fieldErrs, err := h.svc.Create(req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create division", nil)
		return
	}
	if fieldErrs != nil {
		if isDuplicate(fieldErrs) {
			response.Error(c, http.StatusUnprocessableEntity, "Duplicate entry", fieldErrs)
			return
		}
		response.Error(c, http.StatusBadRequest, "Validation failed", fieldErrs)
		return
	}
	userID := c.GetUint("user_id")
	h.actLogger.Log(userID, activitylog.ActionCreate, entityDivision, item.ID, item.Name)
	response.Success(c, http.StatusCreated, "Division created", item)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid division ID", nil)
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
			response.Error(c, http.StatusNotFound, "Division not found", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to update division", nil)
		return
	}
	if fieldErrs != nil {
		if isDuplicate(fieldErrs) {
			response.Error(c, http.StatusUnprocessableEntity, "Duplicate entry", fieldErrs)
			return
		}
		response.Error(c, http.StatusBadRequest, "Validation failed", fieldErrs)
		return
	}
	userID := c.GetUint("user_id")
	h.actLogger.Log(userID, activitylog.ActionUpdate, entityDivision, item.ID, item.Name)
	response.Success(c, http.StatusOK, "Division updated", item)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid division ID", nil)
		return
	}
	item, _ := h.svc.GetByID(uint(id))
	title := ""
	if item != nil {
		title = item.Name
	}
	if err := h.svc.Delete(uint(id)); err != nil {
		if errors.Is(err, ErrNotFound) {
			response.Error(c, http.StatusNotFound, "Division not found", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to delete division", nil)
		return
	}
	userID := c.GetUint("user_id")
	h.actLogger.Log(userID, activitylog.ActionDelete, entityDivision, uint(id), title)
	response.Success(c, http.StatusOK, "Division deleted", nil)
}
