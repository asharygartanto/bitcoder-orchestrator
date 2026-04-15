import api from './api';
import type { Department } from '../types';

export async function getDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/api/departments');
  return data;
}

export async function getDepartmentTree(): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/api/departments/tree');
  return data;
}

export async function getDepartment(id: string): Promise<Department> {
  const { data } = await api.get<Department>(`/api/departments/${id}`);
  return data;
}

export async function createDepartment(dept: {
  name: string;
  description?: string;
  parentId?: string;
  level?: number;
}): Promise<Department> {
  const { data } = await api.post<Department>('/api/departments', dept);
  return data;
}

export async function updateDepartment(
  id: string,
  dept: { name?: string; description?: string; parentId?: string; level?: number },
): Promise<Department> {
  const { data } = await api.patch<Department>(`/api/departments/${id}`, dept);
  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/api/departments/${id}`);
}
