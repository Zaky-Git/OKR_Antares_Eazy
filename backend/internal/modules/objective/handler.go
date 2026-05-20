package objective

import (
	"encoding/json"
	"errors"
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
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", err.Error())
		return
	}

	userID := c.GetUint("user_id")
	obj, fieldErrs, err := h.service.Create(req, userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create objective", nil)
		return
	}
	if fieldErrs != nil {
		// FK invalid → 422; notes too long → 400
		if _, ok := fieldErrs["notes"]; ok {
			response.Error(c, http.StatusBadRequest, "Validation failed", fieldErrs)
			return
		}
		response.Error(c, http.StatusUnprocessableEntity, "Invalid reference", fieldErrs)
		return
	}

	// Activity log: include non-null context fields in new_value
	newVals := buildCreateNewValue(req)
	if newVals != "" {
		h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntityObjective, obj.ID, obj.Title,
			activitylog.WithObjectiveID(obj.ID),
			activitylog.WithNewValue(newVals))
	} else {
		h.actLogger.Log(userID, activitylog.ActionCreate, activitylog.EntityObjective, obj.ID, obj.Title,
			activitylog.WithObjectiveID(obj.ID))
	}

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

// parseOptionalUintQuery returns (*uint, error). If query absent → nil pointer, nil error.
// If present but invalid (non-int or non-positive) → nil pointer, non-nil error.
func parseOptionalUintQuery(c *gin.Context, key string) (*uint, error) {
	v := c.Query(key)
	if v == "" {
		return nil, nil
	}
	parsed, err := strconv.ParseUint(v, 10, 32)
	if err != nil || parsed == 0 {
		return nil, fmt.Errorf("invalid %s", key)
	}
	u := uint(parsed)
	return &u, nil
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

	stratID, err1 := parseOptionalUintQuery(c, "strategy_id")
	if err1 != nil {
		response.Error(c, http.StatusBadRequest, err1.Error(), gin.H{"strategy_id": err1.Error()})
		return
	}
	segID, err2 := parseOptionalUintQuery(c, "segment_id")
	if err2 != nil {
		response.Error(c, http.StatusBadRequest, err2.Error(), gin.H{"segment_id": err2.Error()})
		return
	}
	divID, err3 := parseOptionalUintQuery(c, "division_id")
	if err3 != nil {
		response.Error(c, http.StatusBadRequest, err3.Error(), gin.H{"division_id": err3.Error()})
		return
	}

	objectives, total, fieldErrs, err := h.service.GetByFilter(FindFilter{
		PeriodID:   uint(periodID),
		Page:       page,
		Limit:      limit,
		StrategyID: stratID,
		SegmentID:  segID,
		DivisionID: divID,
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch objectives", nil)
		return
	}
	if fieldErrs != nil {
		response.Error(c, http.StatusBadRequest, "Invalid filter", fieldErrs)
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

	userID := c.GetUint("user_id")
	result, fieldErrs, err := h.service.Update(uint(id), req, userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		case errors.Is(err, ErrForbidden):
			response.Error(c, http.StatusForbidden, "You are not the owner of this objective", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to update objective", nil)
		return
	}
	if fieldErrs != nil {
		if _, ok := fieldErrs["notes"]; ok {
			response.Error(c, http.StatusBadRequest, "Validation failed", fieldErrs)
			return
		}
		response.Error(c, http.StatusUnprocessableEntity, "Invalid reference", fieldErrs)
		return
	}

	// Build delta diff between pre and post
	oldDiff, newDiff := buildUpdateDiff(result.Pre, result.PostDB)

	// Status change has its own activity action for backward compat
	if req.Status != nil && result.Pre.Status != *req.Status {
		h.actLogger.Log(userID, activitylog.ActionStatusChange, activitylog.EntityObjective, result.Post.ID, result.Post.Title,
			activitylog.WithObjectiveID(result.Post.ID),
			activitylog.WithOldValue(result.Pre.Status),
			activitylog.WithNewValue(*req.Status),
			activitylog.WithDescription(fmt.Sprintf("mengubah status objective \"%s\" dari %s ke %s", result.Post.Title, result.Pre.Status, *req.Status)))
	}

	// Skip context UPDATE log when nothing changed (apart from already-logged status)
	if len(oldDiff) > 0 {
		oldJSON, _ := json.Marshal(oldDiff)
		newJSON, _ := json.Marshal(newDiff)
		h.actLogger.Log(userID, activitylog.ActionUpdate, activitylog.EntityObjective, result.Post.ID, result.Post.Title,
			activitylog.WithObjectiveID(result.Post.ID),
			activitylog.WithOldValue(string(oldJSON)),
			activitylog.WithNewValue(string(newJSON)))
	}

	response.Success(c, http.StatusOK, "Objective updated successfully", result.Post)
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
		switch {
		case errors.Is(err, ErrForbidden):
			response.Error(c, http.StatusForbidden, "You are not the owner of this objective", nil)
			return
		case errors.Is(err, ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, err.Error(), nil)
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

// buildCreateNewValue builds JSON of non-null/non-empty context fields for CREATE activity log.
// Returns empty string if no context fields are set.
func buildCreateNewValue(req CreateRequest) string {
	m := map[string]interface{}{}
	if req.StrategyID != nil {
		m["strategy_id"] = *req.StrategyID
	}
	if req.SegmentID != nil {
		m["segment_id"] = *req.SegmentID
	}
	if req.DivisionID != nil {
		m["division_id"] = *req.DivisionID
	}
	if req.OwnerID != nil {
		m["owner_id"] = *req.OwnerID
	}
	if req.Notes != nil {
		// Trim and check non-empty
		if t := *req.Notes; len(t) > 0 {
			m["notes"] = t
		}
	}
	if len(m) == 0 {
		return ""
	}
	b, _ := json.Marshal(m)
	return string(b)
}

// buildUpdateDiff compares pre and post Objective and returns two maps containing only changed fields.
// Status changes are excluded because they have their own activity action.
func buildUpdateDiff(pre, post *Objective) (map[string]interface{}, map[string]interface{}) {
	oldM := map[string]interface{}{}
	newM := map[string]interface{}{}

	if pre.Title != post.Title {
		oldM["title"] = pre.Title
		newM["title"] = post.Title
	}
	if !ptrStringEqual(pre.Description, post.Description) {
		oldM["description"] = ptrString(pre.Description)
		newM["description"] = ptrString(post.Description)
	}
	if !ptrUintEqual(pre.StrategyID, post.StrategyID) {
		oldM["strategy_id"] = ptrUint(pre.StrategyID)
		newM["strategy_id"] = ptrUint(post.StrategyID)
	}
	if !ptrUintEqual(pre.SegmentID, post.SegmentID) {
		oldM["segment_id"] = ptrUint(pre.SegmentID)
		newM["segment_id"] = ptrUint(post.SegmentID)
	}
	if !ptrUintEqual(pre.DivisionID, post.DivisionID) {
		oldM["division_id"] = ptrUint(pre.DivisionID)
		newM["division_id"] = ptrUint(post.DivisionID)
	}
	if !ptrUintEqual(pre.OwnerID, post.OwnerID) {
		oldM["owner_id"] = ptrUint(pre.OwnerID)
		newM["owner_id"] = ptrUint(post.OwnerID)
	}
	if !ptrStringEqual(pre.Notes, post.Notes) {
		oldM["notes"] = ptrString(pre.Notes)
		newM["notes"] = ptrString(post.Notes)
	}
	return oldM, newM
}

func ptrStringEqual(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func ptrUintEqual(a, b *uint) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func ptrString(p *string) interface{} {
	if p == nil {
		return nil
	}
	return *p
}

func ptrUint(p *uint) interface{} {
	if p == nil {
		return nil
	}
	return *p
}
