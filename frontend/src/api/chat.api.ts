import client from './client';
import { ApiResponse } from '../types';

export interface ChatMessagePayload {
  id: string;
  expenseId: string;
  userId: string;
  userName: string;
  content: string | null;
  createdAt: string;
}

export const getMessages = async (expenseId: string): Promise<ApiResponse<ChatMessagePayload[]>> => {
  const response = await client.get<ApiResponse<ChatMessagePayload[]>>(`/api/expenses/${expenseId}/messages`);
  return response.data;
};

export const deleteMessage = async (messageId: string): Promise<ApiResponse<{ id: string }>> => {
  const response = await client.delete<ApiResponse<{ id: string }>>(`/api/messages/${messageId}`);
  return response.data;
};
