import api from './api';

export interface MonitoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  organization: { id: string; name: string; slug: string } | null;
}

export interface MonitorStats {
  total: number;
  active: number;
  inactive: number;
  recentLogins7d: number;
  byRole: Record<string, number>;
}

export async function getMonitorAll(params?: { search?: string; role?: string; orgId?: string }): Promise<{ users: MonitoredUser[]; stats: MonitorStats }> {
  const { data } = await api.get('/api/users/monitor/all', { params });
  return data;
}

export async function getMonitorOrg(): Promise<any> {
  const { data } = await api.get('/api/users/monitor/org');
  return data;
}

export async function getUserStats(): Promise<any> {
  const { data } = await api.get('/api/users/stats');
  return data;
}

export async function crawlUrl(dto: { url: string; title: string; contextId: string; crawlMode?: 'single' | 'depth' | 'full'; maxDepth?: number }): Promise<any> {
  const { data } = await api.post('/api/news-crawl/url', dto);
  return data;
}

export async function bulkCrawl(items: { url: string; title: string; contextId: string; crawlMode?: 'single' | 'depth' | 'full'; maxDepth?: number }[]): Promise<any> {
  const { data } = await api.post('/api/news-crawl/bulk', { items });
  return data;
}
