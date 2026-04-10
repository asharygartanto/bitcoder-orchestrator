import api from './api';
import type { ApiConfig } from '../types';

export async function getApiConfigs(contextId: string): Promise<ApiConfig[]> {
  const { data } = await api.get<ApiConfig[]>(`/api/api-configs/context/${contextId}`);
  return data;
}

export async function createApiConfig(
  contextId: string,
  config: Partial<ApiConfig>,
): Promise<ApiConfig> {
  const { data } = await api.post<ApiConfig>(`/api/api-configs/${contextId}`, config);
  return data;
}

export async function updateApiConfig(
  id: string,
  config: Partial<ApiConfig>,
): Promise<ApiConfig> {
  const { data } = await api.put<ApiConfig>(`/api/api-configs/${id}`, config);
  return data;
}

export async function deleteApiConfig(id: string): Promise<void> {
  await api.delete(`/api/api-configs/${id}`);
}
