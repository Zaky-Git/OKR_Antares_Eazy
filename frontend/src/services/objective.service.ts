import api from './api';
import { ApiResponse, Objective } from '../types';

export interface ObjectiveFilter {
  page?: number;
  limit?: number;
  strategy_id?: number;
  segment_id?: number;
  division_id?: number;
}

function buildQuery(periodId: number, filter: ObjectiveFilter = {}): string {
  const params = new URLSearchParams();
  params.set('period_id', String(periodId));
  params.set('page', String(filter.page ?? 1));
  params.set('limit', String(filter.limit ?? 10));
  if (filter.strategy_id !== undefined) params.set('strategy_id', String(filter.strategy_id));
  if (filter.segment_id !== undefined) params.set('segment_id', String(filter.segment_id));
  if (filter.division_id !== undefined) params.set('division_id', String(filter.division_id));
  return params.toString();
}

export const objectiveService = {
  getByPeriod: (periodId: number, pageOrFilter: number | ObjectiveFilter = 1, limit = 10) => {
    // Backward compatible: support old (periodId, page, limit) signature
    const filter: ObjectiveFilter = typeof pageOrFilter === 'number'
      ? { page: pageOrFilter, limit }
      : pageOrFilter;
    return api.get<ApiResponse<Objective[]>>(`/objectives?${buildQuery(periodId, filter)}`);
  },

  getById: (id: number) =>
    api.get<ApiResponse<Objective>>(`/objectives/${id}`),

  create: (data: {
    period_id: number;
    title: string;
    description?: string;
    confidence_level?: number;
    strategy_id?: number | null;
    segment_id?: number | null;
    division_id?: number | null;
    owner_id?: number | null;
    notes?: string | null;
  }) => api.post<ApiResponse<Objective>>('/objectives', data),

  update: (id: number, data: Partial<Objective> & {
    strategy_id?: number | null;
    segment_id?: number | null;
    division_id?: number | null;
    owner_id?: number | null;
    notes?: string | null;
  }) => api.patch<ApiResponse<Objective>>(`/objectives/${id}`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/objectives/${id}`),

  reorder: (orders: { id: number; sort_order: number }[]) =>
    api.put<ApiResponse<null>>('/objectives-reorder', { orders }),
};
