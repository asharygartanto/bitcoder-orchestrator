import api from './api';

export interface License {
  id: string;
  key: string;
  companyName: string;
  companyAlias: string;
  contactEmail: string;
  contactName: string | null;
  phone: string | null;
  duration: 'ONE_WEEK' | 'ONE_MONTH' | 'ONE_YEAR' | 'CUSTOM';
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  startDate: string;
  expiresAt: string;
  activatedAt: string | null;
  lastValidatedAt: string | null;
  notes: string | null;
  createdAt: string;
  organization: { id: string; name: string; slug: string } | null;
  createdBy: { id: string; name: string; email: string };
}

export interface LicenseStats {
  total: number;
  active: number;
  expired: number;
  pending: number;
  revoked: number;
  expiringSoon: number;
}

export async function getLicenses(): Promise<License[]> {
  const { data } = await api.get<License[]>('/api/licenses');
  return data;
}

export async function getLicenseStats(): Promise<LicenseStats> {
  const { data } = await api.get<LicenseStats>('/api/licenses/stats');
  return data;
}

export async function getLicense(id: string): Promise<License> {
  const { data } = await api.get<License>(`/api/licenses/${id}`);
  return data;
}

export async function createLicense(dto: {
  companyName: string;
  companyAlias: string;
  contactEmail: string;
  contactName?: string;
  phone?: string;
  duration: string;
  startDate: string;
  expiresAt?: string;
  notes?: string;
}): Promise<License> {
  const { data } = await api.post<License>('/api/licenses', dto);
  return data;
}

export async function sendLicenseEmail(id: string): Promise<{ success: boolean; sentTo: string }> {
  const { data } = await api.post<{ success: boolean; sentTo: string }>(`/api/licenses/${id}/send`);
  return data;
}

export async function revokeLicense(id: string): Promise<License> {
  const { data } = await api.patch<License>(`/api/licenses/${id}/revoke`);
  return data;
}

export async function reactivateLicense(id: string): Promise<License> {
  const { data } = await api.patch<License>(`/api/licenses/${id}/reactivate`);
  return data;
}

export async function deleteLicense(id: string): Promise<void> {
  await api.delete(`/api/licenses/${id}`);
}
