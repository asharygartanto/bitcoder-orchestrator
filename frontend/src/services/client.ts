import api from './api';
import type { Client, ClientBranding } from '../types';

export async function getClients(): Promise<Client[]> {
  const { data } = await api.get<Client[]>('/api/clients');
  return data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await api.get<Client>(`/api/clients/${id}`);
  return data;
}

export async function createClient(name: string, slug?: string): Promise<Client> {
  const { data } = await api.post<Client>('/api/clients', { name, slug });
  return data;
}

export async function updateClientConfig(
  id: string,
  config: { dbConfig?: Record<string, any>; aiConfig?: Record<string, any>; storageConfig?: Record<string, any> },
): Promise<Client> {
  const { data } = await api.patch<Client>(`/api/clients/${id}/config`, config);
  return data;
}

export async function updateClientBranding(
  id: string,
  branding: Partial<ClientBranding>,
): Promise<Client> {
  const { data } = await api.patch<Client>(`/api/clients/${id}/branding`, branding);
  return data;
}

export async function getMyBranding(): Promise<ClientBranding | null> {
  const { data } = await api.get<ClientBranding | null>('/api/branding');
  return data;
}

export async function regenerateAgentKey(id: string): Promise<Client> {
  const { data } = await api.post<Client>(`/api/clients/${id}/regenerate-key`);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/api/clients/${id}`);
}
