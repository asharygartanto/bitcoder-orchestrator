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

export async function getUsers(orgId?: string): Promise<OrgUser[]> {
  const { data } = await api.get<OrgUser[]>('/api/users', {
    params: orgId ? { organizationId: orgId } : undefined,
  });
  return data;
}

export async function createUser(dto: {
  email: string;
  name: string;
  password?: string;
  role?: string;
}, orgId?: string): Promise<any> {
  const { data } = await api.post('/api/users', dto, {
    params: orgId ? { organizationId: orgId } : undefined,
  });
  return data;
}

export async function bulkCreateUsers(users: { email: string; name: string; role?: string }[], orgId?: string): Promise<any[]> {
  const { data } = await api.post('/api/users/bulk', { users }, {
    params: orgId ? { organizationId: orgId } : undefined,
  });
  return data;
}

export async function updateUser(id: string, dto: { name?: string; role?: string; isActive?: boolean; departmentId?: string; position?: string }, orgId?: string): Promise<any> {
  const { data } = await api.patch(`/api/users/${id}`, dto, {
    params: orgId ? { organizationId: orgId } : undefined,
  });
  return data;
}

export async function resetUserPassword(id: string, orgId?: string): Promise<{ success: boolean; generatedPassword?: string }> {
  const { data } = await api.post(`/api/users/${id}/reset-password`, {}, {
    params: orgId ? { organizationId: orgId } : undefined,
  });
  return data;
}

export async function deleteUser(id: string, orgId?: string): Promise<void> {
  await api.delete(`/api/users/${id}`, {
    params: orgId ? { organizationId: orgId } : undefined,
  });
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
