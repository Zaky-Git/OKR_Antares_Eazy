import api from './api';
import { ApiResponse, Sprint } from '../types';

export const sprintService = {
  getByPeriod: (periodId: number) =>
    api.get<ApiResponse<Sprint[]>>(`/sprints?period_id=${periodId}`),

  getById: (id: number) =>
    api.get<ApiResponse<Sprint>>(`/sprints/${id}`),

  create: (data: { period_id: number; name: string; goal?: string; start_date: string; end_date: string }) =>
    api.post<ApiResponse<Sprint>>('/sprints', data),

  update: (id: number, data: Partial<Sprint>) =>
    api.patch<ApiResponse<Sprint>>(`/sprints/${id}`, data),

  activate: (id: number) =>
    api.patch<ApiResponse<Sprint>>(`/sprints/${id}/activate`),

  complete: (id: number, data: { review_note?: string; retro_note?: string }) =>
    api.patch<ApiResponse<Sprint>>(`/sprints/${id}/complete`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/sprints/${id}`),
};
