import api from './api';

export async function getSsoConfig(): Promise<any> {
  const { data } = await api.get('/api/sso/config');
  return data;
}

export async function upsertSsoConfig(dto: any): Promise<any> {
  const { data } = await api.post('/api/sso/config', dto);
  return data;
}

export async function toggleSso(isActive: boolean): Promise<any> {
  const { data } = await api.patch('/api/sso/config/toggle', { isActive });
  return data;
}

export async function deleteSsoConfig(): Promise<void> {
  await api.delete('/api/sso/config');
}

export async function getSsoLogin(orgSlug: string): Promise<any> {
  const { data } = await api.get(`/api/sso/login/${orgSlug}`);
  return data;
}
