import api from './api';
import { ApiResponse, Sprint, SprintInitiative, SprintSummary, CarryOverResponse } from '../types';

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

  getSprintInitiatives: (sprintId: number) =>
    api.get<ApiResponse<SprintInitiative[]>>(`/sprints/${sprintId}/initiatives`),

  getSprintSummary: (sprintId: number) =>
    api.get<ApiResponse<SprintSummary>>(`/sprints/${sprintId}/summary`),

  getSprintBacklog: (sprintId: number) =>
    api.get<ApiResponse<SprintInitiative[]>>(`/sprints/${sprintId}/backlog`),

  carryOverInitiatives: (sprintId: number, data: { initiative_ids: number[] }) =>
    api.post<ApiResponse<CarryOverResponse>>(`/sprints/${sprintId}/carry-over`, data),

  assignInitiativeToSprint: (initiativeId: number, data: { sprint_id: number }) =>
    api.patch<ApiResponse<null>>(`/initiatives/${initiativeId}/assign-sprint`, data),

  unassignInitiativeFromSprint: (initiativeId: number) =>
    api.patch<ApiResponse<null>>(`/initiatives/${initiativeId}/unassign-sprint`),
};
