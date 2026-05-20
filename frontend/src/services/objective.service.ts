import api from './api';
import { ApiResponse, Objective } from '../types';

export const objectiveService = {
  getByPeriod: (periodId: number, page = 1, limit = 10) =>
    api.get<ApiResponse<Objective[]>>(`/objectives?period_id=${periodId}&page=${page}&limit=${limit}`),

  getById: (id: number) =>
    api.get<ApiResponse<Objective>>(`/objectives/${id}`),

  create: (data: { period_id: number; title: string; description?: string; confidence_level?: number }) =>
    api.post<ApiResponse<Objective>>('/objectives', data),

  update: (id: number, data: Partial<Objective>) =>
    api.patch<ApiResponse<Objective>>(`/objectives/${id}`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/objectives/${id}`),

  reorder: (orders: { id: number; sort_order: number }[]) =>
    api.put<ApiResponse<null>>('/objectives-reorder', { orders }),
};
