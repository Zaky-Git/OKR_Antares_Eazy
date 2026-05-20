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

export interface StrategyHealth {
  id: number;
  name: string;
  color: string;
  total_objectives: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  off_track: number;
}

export interface DivisionHealth {
  id: number;
  name: string;
  code: string;
  color: string;
  total_objectives: number;
  avg_progress: number;
  on_track: number;
  at_risk: number;
  off_track: number;
}

export interface ContextHealthResponse {
  strategies: StrategyHealth[];
  divisions: DivisionHealth[];
}

export const dashboardService = {
  get: (periodId: number) =>
    api.get<ApiResponse<DashboardSummary>>(`/dashboard?period_id=${periodId}`),

  getAnnual: (year: number) =>
    api.get<ApiResponse<AnnualDashboard>>(`/dashboard/annual?year=${year}`),

  getLogs: (page = 1, limit = 20) =>
    api.get<ApiResponse<ActivityItem[]>>(`/logs?page=${page}&limit=${limit}`),

  getContextHealth: (periodId: number) =>
    api.get<ApiResponse<ContextHealthResponse>>(`/dashboard/context-health?period_id=${periodId}`),
};
