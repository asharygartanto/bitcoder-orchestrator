import api from './api';

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  key?: string;
}

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  const { data } = await api.get<ApiKeyItem[]>('/api/api-keys');
  return data;
}

export async function createApiKey(name: string, expiresAt?: string): Promise<ApiKeyItem> {
  const { data } = await api.post<ApiKeyItem>('/api/api-keys', { name, expiresAt });
  return data;
}

export async function updateApiKey(id: string, dto: { name?: string; isActive?: boolean }): Promise<ApiKeyItem> {
  const { data } = await api.patch<ApiKeyItem>(`/api/api-keys/${id}`, dto);
  return data;
}

export async function deleteApiKey(id: string): Promise<void> {
  await api.delete(`/api/api-keys/${id}`);
}
