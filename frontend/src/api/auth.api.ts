import type { LoginResponse } from '@/types';
import apiClient from './axios';

/**
 * POST /auth/login — le backend attend du JSON { username, password }
 * via @RequestBody (pas form-urlencoded malgré ce que suggère le Javadoc backend).
 */
export async function login(username: string, password: string): Promise<string> {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    username,
    password,
  });
  return response.data['access-token'];
}

export async function getProfile(): Promise<unknown> {
  const response = await apiClient.get('/auth/profile');
  return response.data;
}
