import api from './api';
import { ApiResponse, DashboardSummary, AnnualDashboard } from '../types';

export interface ActivityItem {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number;
  entity_title: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  objective_id: number | null;
  key_result_id: number | null;
  initiative_id: number | null;
  created_at: string;
}

export const dashboardService = {
  get: (periodId: number) =>
    api.get<ApiResponse<DashboardSummary>>(`/dashboard?period_id=${periodId}`),

  getAnnual: (year: number) =>
    api.get<ApiResponse<AnnualDashboard>>(`/dashboard/annual?year=${year}`),

  getLogs: (page = 1, limit = 20) =>
    api.get<ApiResponse<ActivityItem[]>>(`/logs?page=${page}&limit=${limit}`),
};
