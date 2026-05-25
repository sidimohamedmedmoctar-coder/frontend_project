import type {
  DashboardStats,
  AccountsByType,
  MonthlyOperation,
  TopCustomer,
} from '@/types';
import apiClient from './axios';

export async function getStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>('/dashboard/stats');
  return response.data;
}

export async function getAccountsByType(): Promise<AccountsByType> {
  const response = await apiClient.get<AccountsByType>('/dashboard/accounts-by-type');
  return response.data;
}

export async function getOperationsPerMonth(year: number): Promise<MonthlyOperation[]> {
  const response = await apiClient.get<MonthlyOperation[]>(
    '/dashboard/operations-per-month',
    { params: { year } },
  );
  return response.data;
}

export async function getTopCustomers(): Promise<TopCustomer[]> {
  const response = await apiClient.get<TopCustomer[]>('/dashboard/top-customers');
  return response.data;
}
