import api from './api';

export interface OrgUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  position?: string;
  department?: { id: string; name: string } | null;
}

export async function getUsers(): Promise<OrgUser[]> {
  const { data } = await api.get<OrgUser[]>('/api/users');
  return data;
}

export async function createUser(dto: {
  email: string;
  name: string;
  password?: string;
  role?: string;
}): Promise<any> {
  const { data } = await api.post('/api/users', dto);
  return data;
}

export async function bulkCreateUsers(users: { email: string; name: string; role?: string }[]): Promise<any[]> {
  const { data } = await api.post('/api/users/bulk', { users });
  return data;
}

export async function updateUser(id: string, dto: { name?: string; role?: string; isActive?: boolean; departmentId?: string; position?: string }): Promise<any> {
  const { data } = await api.patch(`/api/users/${id}`, dto);
  return data;
}

export async function resetUserPassword(id: string): Promise<{ success: boolean; generatedPassword?: string }> {
  const { data } = await api.post(`/api/users/${id}/reset-password`);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/users/${id}`);
}

export async function forgotPassword(email: string): Promise<{ success: boolean }> {
  const { data } = await api.post('/api/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean }> {
  const { data } = await api.post('/api/auth/reset-password', { token, password });
  return data;
}

export async function changePassword(currentPassword: string, password: string): Promise<{ success: boolean }> {
  const { data } = await api.post('/api/auth/change-password', { currentPassword, password });
  return data;
}
