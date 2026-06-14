import client from './client';
import { User, ApiResponse } from '../types';

interface AuthResponseData {
  accessToken: string;
  user: User;
}

interface RefreshResponseData {
  accessToken: string;
  user: User;
}

/**
 * Log in an existing user.
 */
export const loginUser = async (email: string, password: string): Promise<ApiResponse<AuthResponseData>> => {
  const response = await client.post<ApiResponse<AuthResponseData>>('/api/auth/login', { email, password });
  return response.data;
};

/**
 * Register a new user.
 */
export const registerUser = async (name: string, email: string, password: string): Promise<ApiResponse<AuthResponseData>> => {
  const response = await client.post<ApiResponse<AuthResponseData>>('/api/auth/register', { name, email, password });
  return response.data;
};

/**
 * Silent/manual refresh of the session tokens.
 */
export const refreshToken = async (): Promise<ApiResponse<RefreshResponseData>> => {
  const response = await client.post<ApiResponse<RefreshResponseData>>('/api/auth/refresh');
  return response.data;
};

/**
 * Logs out the active user session.
 */
export const logoutUser = async (): Promise<ApiResponse<{ message: string }>> => {
  const response = await client.post<ApiResponse<{ message: string }>>('/api/auth/logout');
  return response.data;
};
