import api from './api';
import { ApiResponse, Notification } from '../types';

export const notificationService = {
  getAll: (page = 1, limit = 10) =>
    api.get<ApiResponse<Notification[]>>(`/notifications?page=${page}&limit=${limit}`),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: number) =>
    api.patch<ApiResponse<null>>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch<ApiResponse<null>>('/notifications/read-all'),

  checkDue: () =>
    api.post<ApiResponse<{ created: number }>>('/notifications/check-due-initiatives'),
};
