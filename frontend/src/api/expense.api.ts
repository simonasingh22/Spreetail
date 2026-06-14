import client from './client';
import { Expense, ApiResponse, SplitMethod } from '../types';

export interface CreateExpensePayload {
  description: string;
  amount: number;
  date: string;
  paidById: string;
  splitMethod: SplitMethod;
  participants: {
    userId: string;
    shareValue?: number | null;
  }[];
  immediateSettlement?: boolean;
  paymentMethod?: string | null;
}

export interface ListExpensesResponse {
  data: Expense[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export const createExpense = async (
  groupId: string,
  payload: CreateExpensePayload
): Promise<ApiResponse<Expense>> => {
  const response = await client.post<ApiResponse<Expense>>(`/api/groups/${groupId}/expenses`, payload);
  return response.data;
};

export const listExpenses = async (
  groupId: string,
  page = 1,
  limit = 20
): Promise<ListExpensesResponse> => {
  const response = await client.get<ListExpensesResponse>(`/api/groups/${groupId}/expenses`, {
    params: { page, limit }
  });
  return response.data;
};

export const getExpenseDetail = async (id: string): Promise<ApiResponse<Expense>> => {
  const response = await client.get<ApiResponse<Expense>>(`/api/expenses/${id}`);
  return response.data;
};

export const editExpense = async (
  id: string,
  payload: CreateExpensePayload
): Promise<ApiResponse<Expense>> => {
  const response = await client.put<ApiResponse<Expense>>(`/api/expenses/${id}`, payload);
  return response.data;
};

export const deleteExpense = async (id: string): Promise<ApiResponse<{ id: string }>> => {
  const response = await client.delete<ApiResponse<{ id: string }>>(`/api/expenses/${id}`);
  return response.data;
};
