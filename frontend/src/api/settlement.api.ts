import client from './client';
import { Settlement, ApiResponse } from '../types';

export interface CreateSettlementPayload {
  payeeId: string;
  amount: number;
  note?: string | null;
  paymentMethod?: string | null;
}

export const createSettlement = async (
  groupId: string,
  payload: CreateSettlementPayload
): Promise<ApiResponse<Settlement>> => {
  const response = await client.post<ApiResponse<Settlement>>(`/api/groups/${groupId}/settlements`, payload);
  return response.data;
};

export const listSettlements = async (groupId: string): Promise<ApiResponse<Settlement[]>> => {
  const response = await client.get<ApiResponse<Settlement[]>>(`/api/groups/${groupId}/settlements`);
  return response.data;
};

export const deleteSettlement = async (id: string): Promise<ApiResponse<{ id: string }>> => {
  const response = await client.delete<ApiResponse<{ id: string }>>(`/api/settlements/${id}`);
  return response.data;
};
