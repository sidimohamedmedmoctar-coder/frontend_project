import type { Customer } from '@/types';
import apiClient from './axios';

export async function getCustomers(): Promise<Customer[]> {
  const response = await apiClient.get<Customer[]>('/customers');
  return response.data;
}

export async function searchCustomers(keyword: string): Promise<Customer[]> {
  const response = await apiClient.get<Customer[]>('/customers/search', {
    params: { keyword },
  });
  return response.data;
}

export async function getCustomer(id: number): Promise<Customer> {
  const response = await apiClient.get<Customer>(`/customers/${id}`);
  return response.data;
}

export async function saveCustomer(c: Customer): Promise<Customer> {
  const response = await apiClient.post<Customer>('/customers', c);
  return response.data;
}

export async function updateCustomer(id: number, c: Customer): Promise<Customer> {
  const response = await apiClient.put<Customer>(`/customers/${id}`, c);
  return response.data;
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}
