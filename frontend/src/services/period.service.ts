import api from './api';
import { ApiResponse, Period } from '../types';

export const periodService = {
  getAll: () => api.get<ApiResponse<Period[]>>('/periods'),

  getCurrent: () => api.get<ApiResponse<Period>>('/periods/current'),

  ensureCurrentYear: () => api.post<ApiResponse<Period[]>>('/periods/ensure-current-year'),

  ensureYear: (year: number) => api.post<ApiResponse<Period[]>>('/periods/ensure-year', { year }),
};
