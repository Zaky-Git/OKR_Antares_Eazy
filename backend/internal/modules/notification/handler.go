package notification

import (
	"fmt"
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

func (h *Handler) GetNotifications(c *gin.Context) {
	userID := c.GetUint("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	notifications, total, err := h.service.GetNotifications(userID, page, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch notifications", nil)
		return
	}

	totalPages := total / int64(limit)
	if total%int64(limit) != 0 {
		totalPages++
	}

	response.SuccessWithPagination(c, http.StatusOK, "Success", notifications, response.PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *Handler) GetUnreadCount(c *gin.Context) {
	userID := c.GetUint("user_id")

	count, err := h.service.GetUnreadCount(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to fetch unread count", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", UnreadCountResponse{Count: count})
}

func (h *Handler) MarkRead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid notification ID", nil)
		return
	}

	userID := c.GetUint("user_id")
	if err := h.service.MarkRead(uint(id), userID); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to mark notification as read", nil)
		return
	}

	response.Success(c, http.StatusOK, "Notification marked as read", nil)
}

func (h *Handler) MarkAllRead(c *gin.Context) {
	userID := c.GetUint("user_id")

	if err := h.service.MarkAllRead(userID); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to mark all as read", nil)
		return
	}

	response.Success(c, http.StatusOK, "All notifications marked as read", nil)
}

func (h *Handler) CheckDueInitiatives(c *gin.Context) {
	created, err := h.service.CheckDueInitiatives()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to check due initiatives", nil)
		return
	}

	response.Success(c, http.StatusOK, fmt.Sprintf("Created %d notifications", created), map[string]int{"created": created})
}
