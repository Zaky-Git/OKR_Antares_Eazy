import api from './api';
import { ApiResponse, Initiative } from '../types';

export const initiativeService = {
  getMyActiveSprintInitiatives: (periodId: number) =>
    api.get<ApiResponse<{ sprint_id: number | null; initiatives: Initiative[] }>>(`/initiatives/my-active-sprint?period_id=${periodId}`),

  create: (keyResultId: number, data: { title: string; description?: string; assignee_id?: number; sprint_id?: number; due_date?: string }) =>
    api.post<ApiResponse<Initiative>>(`/key-results/${keyResultId}/initiatives`, data),

  createChild: (parentId: number, data: { title: string; description?: string; assignee_id?: number; sprint_id?: number; due_date?: string }) =>
    api.post<ApiResponse<Initiative>>(`/initiatives/${parentId}/children`, data),

  getTree: (keyResultId: number) =>
    api.get<ApiResponse<Initiative[]>>(`/key-results/${keyResultId}/initiative-tree`),

  update: (id: number, data: Partial<Initiative>) =>
    api.patch<ApiResponse<Initiative>>(`/initiatives/${id}`, data),

  updateProgress: (id: number, data: { progress: number; note?: string; blocker?: string }) =>
    api.patch<ApiResponse<Initiative>>(`/initiatives/${id}/progress`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/initiatives/${id}`),
};
