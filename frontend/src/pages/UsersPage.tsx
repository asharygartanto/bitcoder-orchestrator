import React, { useEffect, useState, useRef } from 'react';
import {
  getUsers,
  createUser,
  bulkCreateUsers,
  updateUser,
  resetUserPassword,
  deleteUser,
} from '../services/user';
import type { OrgUser } from '../services/user';
import {
  Plus,
  Upload,
  Key,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Mail,
  Shield,
  Clock,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import clsx from 'clsx';

export default function UsersPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [generatedPw, setGeneratedPw] = useState<{ email: string; password: string } | null>(null);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan user ini?')) return;
    try {
      await deleteUser(id);
      loadUsers();
    } catch {}
  };

  const handleResetPw = async (id: string, email: string) => {
    if (!confirm(`Reset password untuk ${email}? Password baru akan dikirim ke email.`)) return;
    try {
      const result = await resetUserPassword(id);
      if (result.generatedPassword) {
        setGeneratedPw({ email, password: result.generatedPassword });
      } else {
        alert('Password berhasil direset. Cek email untuk password baru.');
      }
    } catch {}
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateUser(id, { isActive: !isActive });
      loadUsers();
    } catch {}
  };

  const downloadTemplate = () => {
    const csv = 'email,name,role\njohn@company.com,John Doe,USER\njane@company.com,Jane Smith,ADMIN\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-bc-border px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-bc-text-dark">Manajemen User</h1>
          <p className="text-xs text-bc-text-muted mt-0.5">{users.length} user terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="rounded-lg p-2 text-bc-text-muted hover:bg-bc-bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1 rounded-lg border border-bc-border px-3 py-1.5 text-xs text-bc-text-secondary hover:bg-bc-bg-muted transition-all"
          >
            <FileDown size={12} /> Template CSV
          </button>
          <button
            onClick={() => setShowBulk(!showBulk)}
            className="flex items-center gap-1 rounded-lg border border-bc-border px-3 py-1.5 text-xs text-bc-text-secondary hover:bg-bc-bg-muted transition-all"
          >
            <Upload size={12} /> Import CSV
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 rounded-lg bg-bc-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-bc-primary-dark transition-all"
          >
            <Plus size={12} /> Tambah User
          </button>
        </div>
      </div>

      {(showAdd || showBulk) && (
        <div className="border-b border-bc-border px-6 py-4 bg-bc-bg-subtle">
          {showAdd && <AddUserForm onDone={(result) => { setShowAdd(false); loadUsers(); if (result?.generatedPassword) setGeneratedPw({ email: result.email, password: result.generatedPassword }); }} />}
          {showBulk && <BulkUploadForm onDone={() => { setShowBulk(false); loadUsers(); }} />}
        </div>
      )}

      {generatedPw && (
        <div className="border-b border-bc-border px-6 py-3 bg-green-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check size={16} className="text-green-600" />
            <div>
              <p className="text-xs text-green-800">Password berhasil digenerate untuk <strong>{generatedPw.email}</strong></p>
              <p className="text-xs text-green-700 font-mono mt-0.5">{generatedPw.password}</p>
              <p className="text-[10px] text-green-600 mt-0.5">Password juga dikirim ke email user. Salin untuk berikan langsung jika perlu.</p>
            </div>
          </div>
          <button onClick={() => setGeneratedPw(null)} className="text-green-600 hover:text-green-800">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="px-6 py-3 border-b border-bc-border">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user berdasarkan nama atau email..."
            className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2 pl-9 pr-4 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-xs text-bc-text-muted">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-bc-text-muted">Tidak ada user ditemukan</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bc-bg-subtle sticky top-0">
              <tr className="text-left text-xs text-bc-text-muted">
                <th className="px-6 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Login Terakhir</th>
                <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bc-border">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-bc-bg-subtle/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bc-primary/10 text-bc-primary text-xs font-medium">
                        {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-bc-text-dark truncate">{user.name || '-'}</p>
                        <p className="text-xs text-bc-text-muted truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600',
                    )}>
                      {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      disabled={user.role === 'SUPER_ADMIN'}
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                      )}
                    >
                      {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-bc-text-muted">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Belum pernah'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleResetPw(user.id, user.email)}
                        className="rounded-lg p-1.5 text-bc-text-muted hover:bg-bc-bg-muted hover:text-bc-primary transition-colors"
                        title="Reset Password"
                      >
                        <Key size={14} />
                      </button>
                      {user.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Hapus User"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AddUserForm({ onDone }: { onDone: (result?: any) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('USER');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setLoading(true);
    try {
      const result = await createUser({ email, name, role: role === 'USER' ? undefined : role });
      onDone(result);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membuat user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-bc-text-dark">Tambah User Baru</h3>
      <p className="text-xs text-bc-text-muted">Password akan digenerate otomatis dan dikirim ke email user.</p>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="Nama lengkap" required />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary" placeholder="user@company.com" required />
        </div>
        <div className="w-32">
          <label className="text-xs font-medium text-bc-text-muted mb-1 block">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary">
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark disabled:opacity-50">
          {loading ? 'Menyimpan...' : 'Buat & Kirim'}
        </button>
        <button type="button" onClick={() => onDone()} className="rounded-lg border border-bc-border px-3 py-2 text-xs text-bc-text-secondary">
          Batal
        </button>
      </div>
    </form>
  );
}

function BulkUploadForm({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      alert('File CSV kosong atau hanya berisi header');
      return;
    }

    const users: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const [email, name, role] = lines[i].split(',').map((s) => s.trim());
      if (email && name) {
        users.push({ email, name, role: role || 'USER' });
      }
    }

    if (users.length === 0) {
      alert('Tidak ada data valid di file CSV');
      return;
    }

    setLoading(true);
    try {
      const res = await bulkCreateUsers(users);
      setResults(res);
    } catch {
      alert('Gagal upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-bc-text-dark">Import User dari CSV</h3>
      <p className="text-xs text-bc-text-muted">
        Upload file CSV dengan format: <code className="text-bc-primary">email,name,role</code>. Download template terlebih dahulu.
      </p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark cursor-pointer">
          <Upload size={12} /> Pilih CSV
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        </label>
        {loading && <span className="text-xs text-bc-text-muted">Memproses...</span>}
        <button onClick={onDone} className="rounded-lg border border-bc-border px-3 py-2 text-xs text-bc-text-secondary">
          Selesai
        </button>
      </div>
      {results && (
        <div className="rounded-lg border border-bc-border bg-white p-3 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-bc-text-dark mb-2">Hasil Import:</p>
          {results.map((r, i) => (
            <p key={i} className={clsx('text-xs', r.status === 'created' ? 'text-green-600' : 'text-red-500')}>
              {r.email}: {r.status === 'created' ? `Berikut (pw: ${r.generatedPassword || 'dikirim via email'})` : r.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
