import api from './api';
import { ApiResponse, User } from '../types';

interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<ApiResponse<User>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', data),

  getMe: () => api.get<ApiResponse<User>>('/auth/me'),

  getUsers: () => api.get<ApiResponse<User[]>>('/users'),
};
