import api from './api';
import type { Department } from '../types';

function orgParams(orgId?: string) {
  return orgId ? { params: { organizationId: orgId } } : undefined;
}

export async function getDepartments(orgId?: string): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/api/departments', orgParams(orgId));
  return data;
}

export async function getDepartmentTree(orgId?: string): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/api/departments/tree', orgParams(orgId));
  return data;
}

export async function getDepartment(id: string, orgId?: string): Promise<Department> {
  const { data } = await api.get<Department>(`/api/departments/${id}`, orgParams(orgId));
  return data;
}

export async function createDepartment(dept: {
  name: string;
  description?: string;
  parentId?: string;
  level?: number;
}, orgId?: string): Promise<Department> {
  const { data } = await api.post<Department>('/api/departments', dept, orgParams(orgId));
  return data;
}

export async function updateDepartment(
  id: string,
  dept: { name?: string; description?: string; parentId?: string; level?: number },
  orgId?: string,
): Promise<Department> {
  const { data } = await api.patch<Department>(`/api/departments/${id}`, dept, orgParams(orgId));
  return data;
}

export async function deleteDepartment(id: string, orgId?: string): Promise<void> {
  await api.delete(`/api/departments/${id}`, orgParams(orgId));
}
