import api from './api';
import type { Context } from '../types';

export async function getContexts(): Promise<Context[]> {
  const { data } = await api.get<Context[]>('/api/contexts');
  return data;
}

export async function getContext(id: string): Promise<Context> {
  const { data } = await api.get<Context>(`/api/contexts/${id}`);
  return data;
}

export async function createContext(name: string, description?: string): Promise<Context> {
  const { data } = await api.post<Context>('/api/contexts', { name, description });
  return data;
}

export async function updateContext(id: string, data: Partial<Context>): Promise<Context> {
  const { data: result } = await api.put<Context>(`/api/contexts/${id}`, data);
  return result;
}

export async function deleteContext(id: string): Promise<void> {
  await api.delete(`/api/contexts/${id}`);
}
