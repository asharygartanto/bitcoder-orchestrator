import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import {
  Monitor as MonitorIcon,
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Shield,
  Globe,
  Activity,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { getMonitorAll, getUserStats } from '../services/monitor';
import type { MonitoredUser, MonitorStats } from '../services/monitor';
import clsx from 'clsx';

export default function MonitoringPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<MonitoredUser[]>([]);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-bc-text-muted">Akses ditolak. Hanya Super Admin.</p>
      </div>
    );
  }

  const load = async () => {
    setLoading(true);
    try {
      const result = await getMonitorAll({ search, role: roleFilter, orgId: selectedOrg });
      setUsers(result.users);
      setStats(result.stats);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, roleFilter, selectedOrg]);

  const orgMap = new Map<string, string>();
  users.forEach((u) => {
    if (u.organization) orgMap.set(u.organization.id, u.organization.name);
  });
  const orgs = Array.from(orgMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-bc-border px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-bc-text-dark">Monitoring & User</h1>
          <p className="text-xs text-bc-text-muted mt-0.5">Pantau semua user dan organisasi client (read-only)</p>
        </div>
        <button onClick={load} className="rounded-lg p-2 text-bc-text-muted hover:bg-bc-bg-muted transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-bc-border">
          <StatCard icon={<Users size={16} />} label="Total User" value={stats.total} color="blue" />
          <StatCard icon={<UserCheck size={16} />} label="Aktif" value={stats.active} color="green" />
          <StatCard icon={<UserX size={16} />} label="Nonaktif" value={stats.inactive} color="red" />
          <StatCard icon={<Activity size={16} />} label="Login 7 hari" value={stats.recentLogins7d} color="purple" />
        </div>
      )}

      <div className="flex items-center gap-3 px-6 py-3 border-b border-bc-border">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2 pl-9 pr-4 text-sm outline-none focus:border-bc-primary"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none">
          <option value="">Semua Role</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
        <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none max-w-[200px]">
          <option value="">Semua Organisasi</option>
          {orgs.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-xs text-bc-text-muted">Memuat...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bc-bg-subtle sticky top-0">
              <tr className="text-left text-xs text-bc-text-muted">
                <th className="px-6 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Organisasi</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Login Terakhir</th>
                <th className="px-4 py-2.5 font-medium">Terdaftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bc-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-bc-bg-subtle/50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bc-primary/10 text-bc-primary text-xs font-medium">
                        {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-bc-text-dark truncate">{u.name || '-'}</p>
                        <p className="text-xs text-bc-text-muted truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Globe size={12} className="text-bc-text-muted" />
                      <span className="text-xs text-bc-text-secondary truncate max-w-[160px]">{u.organization?.name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600',
                    )}>
                      {u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.role === 'ADMIN' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                    )}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', u.isActive ? 'bg-green-500' : 'bg-red-400')} />
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-bc-text-muted">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Belum pernah'}
                  </td>
                  <td className="px-4 py-3 text-xs text-bc-text-muted">
                    {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-bc-border px-6 py-3 flex items-center justify-between bg-bc-bg-subtle">
        <p className="text-xs text-bc-text-muted">
          Menampilkan {users.length} user {stats ? `dari ${stats.total} total` : ''}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-bc-text-muted">
          <Eye size={12} />
          Mode monitoring (read-only)
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="rounded-xl border border-bc-border bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', colors[color])}>
          {icon}
        </div>
        <span className="text-xs text-bc-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-bc-text-dark">{value}</p>
    </div>
  );
}
