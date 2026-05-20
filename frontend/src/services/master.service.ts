import api from './api';
import {
  ApiResponse,
} from '../types';
import {
  Strategy,
  Segment,
  Division,
  CreateStrategyDto,
  UpdateStrategyDto,
  CreateSegmentDto,
  UpdateSegmentDto,
  CreateDivisionDto,
  UpdateDivisionDto,
} from '../types/master';

export interface PaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
}

function buildQuery(params?: PaginatedParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// Strategy API
export const strategiesApi = {
  list: (params?: PaginatedParams) =>
    api.get<ApiResponse<Strategy[]>>(`/strategies${buildQuery(params)}`),
  create: (data: CreateStrategyDto) => api.post<ApiResponse<Strategy>>('/strategies', data),
  update: (id: number, data: UpdateStrategyDto) =>
    api.patch<ApiResponse<Strategy>>(`/strategies/${id}`, data),
  remove: (id: number) => api.delete<ApiResponse<null>>(`/strategies/${id}`),
};

// Segment API
export const segmentsApi = {
  list: (params?: PaginatedParams) =>
    api.get<ApiResponse<Segment[]>>(`/segments${buildQuery(params)}`),
  create: (data: CreateSegmentDto) => api.post<ApiResponse<Segment>>('/segments', data),
  update: (id: number, data: UpdateSegmentDto) =>
    api.patch<ApiResponse<Segment>>(`/segments/${id}`, data),
  remove: (id: number) => api.delete<ApiResponse<null>>(`/segments/${id}`),
};

// Division API
export const divisionsApi = {
  list: (params?: PaginatedParams) =>
    api.get<ApiResponse<Division[]>>(`/divisions${buildQuery(params)}`),
  create: (data: CreateDivisionDto) => api.post<ApiResponse<Division>>('/divisions', data),
  update: (id: number, data: UpdateDivisionDto) =>
    api.patch<ApiResponse<Division>>(`/divisions/${id}`, data),
  remove: (id: number) => api.delete<ApiResponse<null>>(`/divisions/${id}`),
};
