import client from './client';
import { Group, GroupMember, ApiResponse, GroupBalancesResponse } from '../types';

export const createGroup = async (name: string): Promise<ApiResponse<Group>> => {
  const response = await client.post<ApiResponse<Group>>('/api/groups', { name });
  return response.data;
};

export const listGroups = async (): Promise<ApiResponse<{ id: string; name: string; role: string; joinedAt: string; memberCount: number }[]>> => {
  const response = await client.get<ApiResponse<{ id: string; name: string; role: string; joinedAt: string; memberCount: number }[]>>('/api/groups');
  return response.data;
};

export const getGroupDetail = async (id: string): Promise<ApiResponse<Group>> => {
  const response = await client.get<ApiResponse<Group>>(`/api/groups/${id}`);
  return response.data;
};

export const renameGroup = async (id: string, name: string): Promise<ApiResponse<Group>> => {
  const response = await client.put<ApiResponse<Group>>(`/api/groups/${id}`, { name });
  return response.data;
};

export const deleteGroup = async (id: string): Promise<ApiResponse<{ id: string }>> => {
  const response = await client.delete<ApiResponse<{ id: string }>>(`/api/groups/${id}`);
  return response.data;
};

export const addMember = async (groupId: string, email: string): Promise<ApiResponse<GroupMember>> => {
  const response = await client.post<ApiResponse<GroupMember>>(`/api/groups/${groupId}/members`, { email });
  return response.data;
};

export const removeMember = async (groupId: string, userId: string): Promise<ApiResponse<{ userId: string }>> => {
  const response = await client.delete<ApiResponse<{ userId: string }>>(`/api/groups/${groupId}/members/${userId}`);
  return response.data;
};

export const getGroupBalances = async (groupId: string): Promise<ApiResponse<GroupBalancesResponse>> => {
  const response = await client.get<ApiResponse<GroupBalancesResponse>>(`/api/groups/${groupId}/balances`);
  return response.data;
};

export const getUserGlobalSummary = async (): Promise<ApiResponse<{ totalOwed: number; totalOwedTo: number; netBalance: number }>> => {
  const response = await client.get<ApiResponse<{ totalOwed: number; totalOwedTo: number; netBalance: number }>>('/api/groups/balances/summary');
  return response.data;
};
