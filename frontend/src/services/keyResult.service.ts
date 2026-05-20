import api from './api';
import { ApiResponse, KeyResult } from '../types';

export const keyResultService = {
  getByObjective: (objectiveId: number) =>
    api.get<ApiResponse<KeyResult[]>>(`/objectives/${objectiveId}/key-results`),

  create: (objectiveId: number, data: { title: string; target_value: number; current_value?: number; metric_unit?: string; confidence_level?: number; description?: string }) =>
    api.post<ApiResponse<KeyResult>>(`/objectives/${objectiveId}/key-results`, data),

  update: (id: number, data: Partial<KeyResult>) =>
    api.patch<ApiResponse<KeyResult>>(`/key-results/${id}`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/key-results/${id}`),

  toggleMilestone: (id: number) =>
    api.patch<ApiResponse<KeyResult>>(`/key-results/${id}/toggle-milestone`),
};
