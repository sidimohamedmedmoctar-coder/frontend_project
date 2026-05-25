import type { AppUser, CreateUserDto, ChangePasswordDto } from '@/types';
import apiClient from './axios';

/**
 * Note: le backend retourne les rôles comme string[] dans UserDTO.
 * Les fonctions ci-dessous castent vers AppUser pour rester cohérents
 * avec les types frontend ; les roles seront des strings à l'exécution.
 */

export async function getUsers(): Promise<AppUser[]> {
  const response = await apiClient.get<AppUser[]>('/admin/users');
  return response.data;
}

export async function createUser(dto: CreateUserDto): Promise<AppUser> {
  const response = await apiClient.post<AppUser>('/admin/users', dto);
  return response.data;
}

export async function addRole(userId: number, role: string): Promise<AppUser> {
  const response = await apiClient.put<AppUser>(
    `/admin/users/${userId}/roles`,
    null,
    { params: { role } },
  );
  return response.data;
}

export async function removeRole(userId: number, roleName: string): Promise<AppUser> {
  const response = await apiClient.delete<AppUser>(
    `/admin/users/${userId}/roles/${roleName}`,
  );
  return response.data;
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}

export async function getMe(): Promise<AppUser> {
  const response = await apiClient.get<AppUser>('/account/me');
  return response.data;
}

export async function changePassword(dto: ChangePasswordDto): Promise<void> {
  await apiClient.put('/account/change-password', dto);
}
