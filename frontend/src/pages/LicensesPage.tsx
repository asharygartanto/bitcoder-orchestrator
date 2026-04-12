import React, { useEffect, useState } from 'react';
import {
  getLicenses,
  getLicenseStats,
  createLicense,
  sendLicenseEmail,
  revokeLicense,
  reactivateLicense,
  deleteLicense,
} from '../services/license';
import type { License, LicenseStats } from '../services/license';
import {
  Plus,
  Key,
  Mail,
  Ban,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Eye,
  Copy,
  Check,
  X,
  Shield,
  Building2,
  Calendar,
  Send,
} from 'lucide-react';
import clsx from 'clsx';

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [data, s] = await Promise.all([getLicenses(), getLicenseStats()]);
      setLicenses(data);
      setStats(s);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = licenses.filter((l) => {
    const matchSearch = !search
      || l.companyName.toLowerCase().includes(search.toLowerCase())
      || l.companyAlias.toLowerCase().includes(search.toLowerCase())
      || l.contactEmail.toLowerCase().includes(search.toLowerCase())
      || l.key.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSend = async (id: string, email: string) => {
    try {
      await sendLicenseEmail(id);
      setSentTo(email);
      setTimeout(() => setSentTo(null), 3000);
    } catch {}
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Cabut license "${name}"? Client tidak bisa menggunakan license ini lagi.`)) return;
    try {
      await revokeLicense(id);
      load();
    } catch {}
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateLicense(id);
      load();
    } catch {}
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus license "${name}"? Tindakan permanen.`)) return;
    try {
      await deleteLicense(id);
      load();
    } catch {}
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const durationLabel: Record<string, string> = {
    ONE_WEEK: '1 Minggu',
    ONE_MONTH: '1 Bulan',
    ONE_YEAR: '1 Tahun',
    CUSTOM: 'Custom',
  };

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aktif' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Menunggu' },
    EXPIRED: { bg: 'bg-red-100', text: 'text-red-600', label: 'Kadaluarsa' },
    REVOKED: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Dicabut' },
  };

  const selected = licenses.find((l) => l.id === selectedId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-bc-border px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-bc-text-dark">License Keys</h1>
          <p className="text-xs text-bc-text-muted mt-0.5">Generate & kelola license key untuk client</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-lg p-2 text-bc-text-muted hover:bg-bc-bg-muted">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 rounded-lg bg-bc-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-bc-primary-dark"
          >
            <Plus size={12} /> Generate Key
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 px-6 py-3 border-b border-bc-border">
          <MiniStat label="Total" value={stats.total} />
          <MiniStat label="Aktif" value={stats.active} color="green" />
          <MiniStat label="Menunggu" value={stats.pending} color="yellow" />
          <MiniStat label="Kadaluarsa" value={stats.expired} color="red" />
          <MiniStat label="Dicabut" value={stats.revoked} color="gray" />
          <MiniStat label="Segera Expired" value={stats.expiringSoon} color="orange" />
        </div>
      )}

      {sentTo && (
        <div className="border-b border-bc-border px-6 py-2 bg-green-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600" />
            <p className="text-xs text-green-800">License key berhasil dikirim ke <strong>{sentTo}</strong></p>
          </div>
          <button onClick={() => setSentTo(null)}><X size={14} className="text-green-600" /></button>
        </div>
      )}

      {showCreate && (
        <div className="border-b border-bc-border px-6 py-4 bg-bc-bg-subtle">
          <CreateLicenseForm
            onDone={(result) => {
              setShowCreate(false);
              load();
              if (result) {
                setSelectedId(result.id);
              }
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-3 px-6 py-3 border-b border-bc-border">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari perusahaan, alias, email, atau key..."
            className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2 pl-9 pr-4 text-sm outline-none focus:border-bc-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-bc-border bg-white px-3 py-2 text-sm">
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PENDING">Menunggu</option>
          <option value="EXPIRED">Kadaluarsa</option>
          <option value="REVOKED">Dicabut</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-xs text-bc-text-muted">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <Key size={32} className="mx-auto mb-3 text-bc-text-muted" />
            <p className="text-sm text-bc-text-secondary">Belum ada license key</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bc-bg-subtle sticky top-0">
              <tr className="text-left text-xs text-bc-text-muted">
                <th className="px-6 py-2.5 font-medium">Perusahaan</th>
                <th className="px-4 py-2.5 font-medium">License Key</th>
                <th className="px-4 py-2.5 font-medium">Durasi</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Berlaku</th>
                <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bc-border">
              {filtered.map((lic) => {
                const sc = statusConfig[lic.status] || statusConfig.PENDING;
                const isExpired = new Date(lic.expiresAt) < new Date();
                const daysLeft = Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={lic.id} className="hover:bg-bc-bg-subtle/50 cursor-pointer" onClick={() => setSelectedId(selectedId === lic.id ? null : lic.id)}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bc-primary/10 text-bc-primary text-xs font-bold">
                          {lic.companyName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-bc-text-dark truncate">{lic.companyName}</p>
                          <p className="text-xs text-bc-text-muted truncate">{lic.companyAlias} · {lic.contactEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono text-bc-primary">{lic.key}</code>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(lic.key); }}
                          className="p-0.5 text-bc-text-muted hover:text-bc-primary"
                        >
                          {copied === lic.key ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-bc-text-secondary">{durationLabel[lic.duration]}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium', sc.bg, sc.text)}>
                        {sc.label}
                      </span>
                      {lic.status === 'ACTIVE' && daysLeft <= 30 && daysLeft > 0 && (
                        <p className="text-[10px] text-orange-500 mt-0.5">{daysLeft} hari lagi</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-bc-text-muted">
                      <p>{new Date(lic.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[10px]">s/d {new Date(lic.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleSend(lic.id, lic.contactEmail)} className="rounded-lg p-1.5 text-bc-text-muted hover:bg-bc-bg-muted hover:text-bc-primary" title="Kirim via Email">
                          <Send size={14} />
                        </button>
                        {lic.status !== 'REVOKED' ? (
                          <button onClick={() => handleRevoke(lic.id, lic.companyName)} className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500" title="Cabut">
                            <Ban size={14} />
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(lic.id)} className="rounded-lg p-1.5 text-bc-text-muted hover:bg-green-50 hover:text-green-600" title="Aktifkan kembali">
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(lic.id, lic.companyName)} className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500" title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="border-t border-bc-border px-6 py-3 bg-bc-bg-subtle space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-bc-text-muted" />
              <span className="text-xs font-medium text-bc-text-dark">{selected.companyName}</span>
              <span className="text-[10px] text-bc-text-muted">({selected.companyAlias})</span>
            </div>
            <button onClick={() => setSelectedId(null)}><X size={14} className="text-bc-text-muted" /></button>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-bc-text-muted">
            <span className="flex items-center gap-1"><Mail size={10} /> {selected.contactEmail}{selected.contactName ? ` (${selected.contactName})` : ''}</span>
            {selected.phone && <span>{selected.phone}</span>}
            {selected.activatedAt && <span>Aktivasi: {new Date(selected.activatedAt).toLocaleDateString('id-ID')}</span>}
            {selected.lastValidatedAt && <span>Validasi terakhir: {new Date(selected.lastValidatedAt).toLocaleDateString('id-ID')}</span>}
            {selected.organization && <span>Org: {selected.organization.name}</span>}
            {selected.notes && <span className="italic">"{selected.notes}"</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    gray: 'text-gray-500',
    orange: 'text-orange-600',
  };
  return (
    <div className="text-center">
      <p className={clsx('text-lg font-bold', color ? colors[color] : 'text-bc-text-dark')}>{value}</p>
      <p className="text-[10px] text-bc-text-muted">{label}</p>
    </div>
  );
}

function CreateLicenseForm({ onDone }: { onDone: (result?: License) => void }) {
  const [companyName, setCompanyName] = useState('');
  const [companyAlias, setCompanyAlias] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState('ONE_MONTH');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !companyAlias || !contactEmail || !startDate) return;
    setLoading(true);
    try {
      const result = await createLicense({
        companyName,
        companyAlias: companyAlias || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        contactEmail,
        contactName: contactName || undefined,
        phone: phone || undefined,
        duration,
        startDate,
        expiresAt: duration === 'CUSTOM' ? expiresAt : undefined,
        notes: notes || undefined,
      });
      onDone(result);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membuat license');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold text-bc-text-dark">Generate License Key Baru</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Nama Perusahaan *</label>
          <input value={companyName} onChange={(e) => { setCompanyName(e.target.value); if (!companyAlias) setCompanyAlias(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')); }} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="PT Maju Jaya" required />
        </div>
        <div>
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Nama Alias *</label>
          <input value={companyAlias} onChange={(e) => setCompanyAlias(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="maju-jaya" required />
        </div>
        <div>
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Email Kontak *</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="admin@ptmaju.co.id" required />
        </div>
        <div>
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Nama Kontak</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="Admin IT" />
        </div>
        <div>
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Telepon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="+62 812 3456 7890" />
        </div>
        <div>
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Masa Berlaku</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary">
            <option value="ONE_WEEK">1 Minggu</option>
            <option value="ONE_MONTH">1 Bulan</option>
            <option value="ONE_YEAR">1 Tahun</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Tanggal Mulai *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" required />
        </div>
        {duration === 'CUSTOM' && (
          <div>
            <label className="text-xs font-medium text-bc-text-muted mb-1 block">Tanggal Berakhir *</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" required />
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-bc-text-muted mb-1 block">Catatan</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="Catatan internal (opsional)" />
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading} className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark disabled:opacity-50">
          {loading ? 'Generating...' : 'Generate License Key'}
        </button>
        <button type="button" onClick={() => onDone()} className="rounded-lg border border-bc-border px-3 py-2 text-xs text-bc-text-secondary">
          Batal
        </button>
      </div>
    </form>
  );
}
