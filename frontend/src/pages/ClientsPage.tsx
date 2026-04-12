import React, { useEffect, useState } from 'react';
import {
  getClients,
  createClient,
  updateClientConfig,
  updateClientBranding,
  regenerateAgentKey,
  deleteClient,
} from '../services/client';
import type { Client, ClientHealthStatus, ClientBranding } from '../types';
import {
  Plus,
  Server,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Key,
  Database,
  Brain,
  HardDrive,
  Cpu,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  BookOpen,
  Monitor,
  Wifi,
  Shield,
  Palette,
  Upload,
  Image,
} from 'lucide-react';
import clsx from 'clsx';

type ConfigTab = 'branding' | 'database' | 'ai' | 'storage';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [configTab, setConfigTab] = useState<ConfigTab>('database');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 30000);
    return () => clearInterval(interval);
  }, []);

  const selected = clients.find((c) => c.id === selectedId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const client = await createClient(newName.trim());
      setClients([client, ...clients]);
      setSelectedId(client.id);
      setNewName('');
      setShowCreate(false);
    } catch {}
  };

  const handleRegenerate = async (id: string) => {
    if (!confirm('Regenerate agent key? The current key will stop working.')) return;
    try {
      const updated = await regenerateAgentKey(id);
      setClients(clients.map((c) => (c.id === id ? updated : c)));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client and its organization? This cannot be undone.')) return;
    try {
      await deleteClient(id);
      setClients(clients.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {}
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-bc-border bg-bc-bg-subtle flex flex-col">
        <div className="p-4 border-b border-bc-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-bc-text-dark">Clients</h2>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1 rounded-lg bg-bc-primary/10 px-2.5 py-1.5 text-xs font-medium text-bc-primary transition-all hover:bg-bc-primary/10"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {showCreate && (
            <div className="space-y-2 animate-slide-up">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Client name (e.g. PT Maju Jaya)"
                className="w-full rounded-lg border border-bc-border bg-bc-bg-muted px-3 py-2 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 rounded-lg bg-bc-primary py-1.5 text-xs font-semibold text-white hover:bg-bc-primary-dark transition-all"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); }}
                  className="rounded-lg border border-bc-border px-3 py-1.5 text-xs text-bc-text-secondary hover:bg-bc-bg-dark transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-xs text-bc-text-muted">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="p-4 text-center">
              <Server size={24} className="mx-auto mb-2 text-bc-text-muted" />
              <p className="text-xs text-bc-text-muted">No clients yet. Add one above.</p>
            </div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className={clsx(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all',
                  selectedId === client.id
                    ? 'bg-bc-primary/10 text-bc-primary glow-border'
                    : 'text-bc-text-secondary hover:bg-bc-bg-dark hover:text-bc-text-dark',
                )}
                onClick={() => setSelectedId(client.id)}
              >
                <StatusDot status={client.status} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  <p className="truncate text-xs text-bc-text-muted">
                    {client.organization?.slug}
                  </p>
                </div>
                <span className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  client.status === 'ONLINE' ? 'bg-green-100 text-green-700' :
                  client.status === 'SETTING_UP' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500',
                )}>
                  {client.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <ClientDetail
            client={selected}
            configTab={configTab}
            setConfigTab={setConfigTab}
            saving={saving}
            setSaving={setSaving}
            copied={copied}
            showGuide={showGuide}
            setShowGuide={setShowGuide}
            onCopy={handleCopy}
            onRegenerate={() => handleRegenerate(selected.id)}
            onDelete={() => handleDelete(selected.id)}
            onRefresh={loadClients}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Server size={48} className="mx-auto mb-3 text-bc-text-muted" />
              <h3 className="text-lg font-semibold text-bc-text-secondary">Select a Client</h3>
              <p className="mt-1 text-sm text-bc-text-muted">
                Choose or create a client to manage configurations and view status.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <div
      className={clsx(
        'h-2.5 w-2.5 rounded-full shrink-0',
        status === 'ONLINE' ? 'bg-green-500' :
        status === 'SETTING_UP' ? 'bg-yellow-500 animate-pulse' :
        'bg-gray-300',
      )}
    />
  );
}

function ClientDetail({
  client,
  configTab,
  setConfigTab,
  saving,
  setSaving,
  copied,
  onCopy,
  onRegenerate,
  onDelete,
  onRefresh,
  showGuide,
  setShowGuide,
}: {
  client: Client;
  configTab: ConfigTab;
  setConfigTab: (t: ConfigTab) => void;
  saving: boolean;
  setSaving: (s: boolean) => void;
  copied: boolean;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  showGuide: boolean;
  setShowGuide: (v: boolean) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>({});
  const hasChanges = JSON.stringify(form) !== '{}';

  useEffect(() => {
    setForm({});
  }, [client.id, configTab]);

  const getCurrentConfig = () => {
    switch (configTab) {
      case 'database': return client.dbConfig || {};
      case 'ai': return client.aiConfig || {};
      case 'storage': return client.storageConfig || {};
    }
  };

  const mergedConfig = { ...getCurrentConfig(), ...form };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      payload[`${configTab}Config`] = form;
      await updateClientConfig(client.id, payload);
      onRefresh();
      setForm({});
    } catch {} finally {
      setSaving(false);
    }
  };

  const health = client.healthStatus as ClientHealthStatus | null;
  const lastSeen = client.lastSeenAt
    ? timeAgo(new Date(client.lastSeenAt))
    : 'Never';

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-bc-text-dark">{client.name}</h2>
          <p className="text-sm text-bc-text-muted mt-1">{client.organization?.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="rounded-lg p-2 text-bc-text-muted hover:bg-bc-bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 rounded-lg border border-bc-border px-3 py-1.5 text-xs text-bc-text-secondary hover:bg-bc-bg-muted transition-all"
            title="Regenerate Agent Key"
          >
            <Key size={12} /> Regenerate Key
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-bc-border bg-bc-bg-muted/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusDot status={client.status} />
            <span className="text-sm font-medium text-bc-text-dark">
              {client.status === 'ONLINE' ? 'Connected' : client.status === 'SETTING_UP' ? 'Setting Up' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-bc-text-muted">
            <Clock size={12} />
            Last seen: {lastSeen}
          </div>
        </div>

        {health && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ServiceCard
              icon={<Database size={14} />}
              name="PostgreSQL"
              status={health.postgres?.status || 'unknown'}
              detail={health.postgres?.latencyMs != null && health.postgres.latencyMs >= 0 ? `${health.postgres.latencyMs}ms` : undefined}
            />
            <ServiceCard
              icon={<Brain size={14} />}
              name="ChromaDB"
              status={health.chromadb?.status || 'unknown'}
              detail={health.chromadb?.latencyMs != null && health.chromadb.latencyMs >= 0 ? `${health.chromadb.latencyMs}ms` : undefined}
            />
            <ServiceCard
              icon={<Server size={14} />}
              name="RAG Engine"
              status={health.ragEngine?.status || 'unknown'}
              detail={health.ragEngine?.version}
            />
            <div className="space-y-1">
              <ServiceCard
                icon={<HardDrive size={14} />}
                name="Disk"
                status={health.disk?.usedPercent > 90 ? 'warning' : 'up'}
                detail={health.disk ? `${health.disk.usedPercent}%` : undefined}
              />
              <ServiceCard
                icon={<Cpu size={14} />}
                name="Memory"
                status={health.memory?.usedPercent > 90 ? 'warning' : 'up'}
                detail={health.memory ? `${health.memory.usedPercent}%` : undefined}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-bc-border bg-bc-bg-muted/50 p-4">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-bc-primary" />
            <h3 className="text-sm font-semibold text-bc-text-dark">Panduan Setup untuk Client</h3>
          </div>
          {showGuide ? <ChevronDown size={16} className="text-bc-text-muted" /> : <ChevronRight size={16} className="text-bc-text-muted" />}
        </button>

        {showGuide && (
          <div className="mt-4 space-y-5">

            <div className="rounded-lg bg-bc-primary/5 border border-bc-primary/10 p-4">
              <h4 className="text-xs font-bold text-bc-primary uppercase tracking-wide mb-2">Ringkasan</h4>
              <p className="text-xs text-bc-text-secondary leading-relaxed">
                Kirim panduan ini ke tim IT di sisi client (perusahaan). Mereka hanya perlu menyiapkan server dengan akses internet,
                lalu menjalankan <strong>satu perintah</strong> yang ada di bawah. Semua instalasi dilakukan otomatis.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-bc-text-dark uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-primary text-[10px] text-white font-bold">1</span>
                Persyaratan Server
              </h4>
              <div className="rounded-lg border border-bc-border bg-white p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Monitor size={14} className="mt-0.5 shrink-0 text-bc-text-muted" />
                  <div>
                    <p className="text-xs font-medium text-bc-text-dark">Sistem Operasi</p>
                    <p className="text-xs text-bc-text-muted">Ubuntu 22.04+ atau Debian 12+ (direkomendasikan Ubuntu 24.04 LTS)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Cpu size={14} className="mt-0.5 shrink-0 text-bc-text-muted" />
                  <div>
                    <p className="text-xs font-medium text-bc-text-dark">Spesifikasi Minimum</p>
                    <p className="text-xs text-bc-text-muted">4 vCPU, 8 GB RAM, 100 GB SSD</p>
                    <p className="text-xs text-bc-text-muted">Rekomendasi: 8 vCPU, 16 GB RAM, 250 GB SSD</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Wifi size={14} className="mt-0.5 shrink-0 text-bc-text-muted" />
                  <div>
                    <p className="text-xs font-medium text-bc-text-dark">Jaringan</p>
                    <p className="text-xs text-bc-text-muted">
                      Akses internet <strong>outbound</strong> ke port 443 (HTTPS).
                      <span className="text-green-600 font-medium"> Tidak perlu membuka port inbound.</span>
                      <span className="text-green-600 font-medium"> Tidak perlu VPN, tunnel, atau public IP.</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield size={14} className="mt-0.5 shrink-0 text-bc-text-muted" />
                  <div>
                    <p className="text-xs font-medium text-bc-text-dark">Akses</p>
                    <p className="text-xs text-bc-text-muted">Akses SSH ke server dengan privilege <code className="text-bc-primary">sudo</code></p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-bc-text-dark uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-primary text-[10px] text-white font-bold">2</span>
                Perintah Instalasi
              </h4>
              <div className="rounded-lg border border-bc-border bg-white p-3 space-y-2">
                <p className="text-xs text-bc-text-secondary">
                  Login ke server client via SSH, lalu jalankan perintah berikut:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-bc-bg-dark px-3 py-2.5 text-xs text-bc-primary font-mono break-all leading-relaxed select-all">
                    {client.installCommand || `curl -sSL https://orchestrator.gartanto.site/api/agent/install.sh | bash -s -- --key=${client.agentKey}`}
                  </code>
                  <button
                    onClick={() => onCopy(client.installCommand || '')}
                    className="shrink-0 rounded-lg border border-bc-border px-3 py-2.5 text-xs text-bc-text-secondary hover:bg-bc-bg-dark transition-colors flex items-center gap-1"
                  >
                    {copied ? <><Check size={12} className="text-green-500" /> Tersalin</> : <><Copy size={12} /> Salin</>}
                  </button>
                </div>
                <p className="text-xs text-bc-text-muted">
                  Perintah ini akan menginstal Docker (jika belum ada), mengunduh semua komponen, dan menjalankan layanan secara otomatis.
                  Proses membutuhkan waktu sekitar 3-5 menit.
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-bc-text-dark uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-primary text-[10px] text-white font-bold">3</span>
                Yang Terjadi Secara Otomatis
              </h4>
              <div className="rounded-lg border border-bc-border bg-white p-3">
                <ul className="space-y-2">
                  {[
                    { label: 'Docker Engine', desc: 'Terinstal dan dikonfigurasi otomatis jika belum ada' },
                    { label: 'Docker Compose', desc: 'Plugin compose terinstal otomatis' },
                    { label: 'PostgreSQL 16', desc: 'Database berjalan di dalam container' },
                    { label: 'ChromaDB', desc: 'Vector database untuk penyimpanan embeddings' },
                    { label: 'RAG Engine', desc: 'Layanan pemrosesan dokumen dan query AI' },
                    { label: 'Bitcoder Agent', desc: 'Agent yang menghubungkan server client ke orchestrator cloud' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check size={12} className="mt-0.5 shrink-0 text-green-500" />
                      <div>
                        <span className="font-medium text-bc-text-dark">{item.label}</span>
                        <span className="text-bc-text-muted"> — {item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-bc-text-dark uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-primary text-[10px] text-white font-bold">4</span>
                Verifikasi
              </h4>
              <div className="rounded-lg border border-bc-border bg-white p-3 space-y-2">
                <p className="text-xs text-bc-text-secondary">
                  Setelah instalasi selesai, minta tim IT client untuk memastikan:
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs">
                    <Check size={12} className="mt-0.5 shrink-0 text-bc-text-muted" />
                    <span className="text-bc-text-muted">Semua container berjalan: <code className="text-bc-primary">cd /opt/bitcoder-agent && docker compose ps</code></span>
                  </li>
                  <li className="flex items-start gap-2 text-xs">
                    <Check size={12} className="mt-0.5 shrink-0 text-bc-text-muted" />
                    <span className="text-bc-text-muted">Agent tidak ada error: <code className="text-bc-primary">docker compose logs agent</code></span>
                  </li>
                  <li className="flex items-start gap-2 text-xs">
                    <Check size={12} className="mt-0.5 shrink-0 text-bc-text-muted" />
                    <span className="text-bc-text-muted">Status di dashboard ini berubah menjadi <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online</span></span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-bc-text-dark uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-primary text-[10px] text-white font-bold">5</span>
                Setelah Berhasil Terhubung
              </h4>
              <div className="rounded-lg border border-bc-border bg-white p-3 space-y-2">
                <p className="text-xs text-bc-text-secondary">
                  Setelah agent terhubung ke cloud, Anda dapat melakukan hal berikut dari halaman ini <strong>tanpa perlu mengakses server client</strong>:
                </p>
                <ul className="space-y-1.5">
                  {[
                    'Mengkonfigurasi database, AI API key, dan penyimpanan melalui tab Configuration di bawah',
                    'Melihat status kesehatan semua layanan (PostgreSQL, ChromaDB, RAG Engine) secara real-time',
                    'Menambahkan user untuk tim client melalui menu Admin',
                    'Membuat knowledge context dan mengunggah dokumen',
                    'Semua perubahan konfigurasi otomatis terkirim ke server client',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check size={12} className="mt-0.5 shrink-0 text-bc-text-muted" />
                      <span className="text-bc-text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <h4 className="text-xs font-bold text-yellow-800 mb-1">Perintah Berguna untuk Tim IT Client</h4>
              <div className="space-y-1 font-mono text-[11px] text-yellow-900">
                <p><span className="text-yellow-600">#</span> Melihat log agent</p>
                <p className="bg-yellow-100 rounded px-2 py-1">cd /opt/bitcoder-agent && docker compose logs -f agent</p>
                <p className="mt-1"><span className="text-yellow-600">#</span> Melihat status semua layanan</p>
                <p className="bg-yellow-100 rounded px-2 py-1">cd /opt/bitcoder-agent && docker compose ps</p>
                <p className="mt-1"><span className="text-yellow-600">#</span> Memulai ulang layanan</p>
                <p className="bg-yellow-100 rounded px-2 py-1">cd /opt/bitcoder-agent && docker compose restart</p>
                <p className="mt-1"><span className="text-yellow-600">#</span> Menghentikan semua layanan</p>
                <p className="bg-yellow-100 rounded px-2 py-1">cd /opt/bitcoder-agent && docker compose down</p>
              </div>
            </div>

          </div>
        )}
      </div>

      <div className="rounded-xl border border-bc-border bg-bc-bg-muted/50 p-4">
        <h3 className="text-sm font-semibold text-bc-text-dark mb-3">Configuration</h3>
        <p className="text-xs text-bc-text-muted mb-3">
          {configTab === 'branding'
            ? 'Kustomisasi tampilan aplikasi untuk client. Perubahan langsung diterapkan.'
            : 'Edit configuration here. Changes are pushed to the client agent automatically.'}
        </p>

        <div className="flex gap-1 mb-4">
          {(['branding', 'database', 'ai', 'storage'] as ConfigTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setConfigTab(tab)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1',
                configTab === tab
                  ? 'bg-bc-primary text-white'
                  : 'bg-bc-bg-dark text-bc-text-secondary hover:text-bc-text-dark',
              )}
            >
              {tab === 'branding' && <Palette size={12} />}
              {tab === 'ai' ? 'AI' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {configTab === 'branding' && (
            <BrandingTab
              client={client}
              saving={saving}
              setSaving={setSaving}
              onRefresh={onRefresh}
            />
          )}
          {configTab === 'database' && (
            <>
              <ConfigField label="Host" value={mergedConfig.host} onChange={(v) => setForm({ ...form, host: v })} />
              <ConfigField label="Port" value={mergedConfig.port} onChange={(v) => setForm({ ...form, port: v })} />
              <ConfigField label="Database Name" value={mergedConfig.name} onChange={(v) => setForm({ ...form, name: v })} />
              <ConfigField label="User" value={mergedConfig.user} onChange={(v) => setForm({ ...form, user: v })} />
              <ConfigField label="Password" value={mergedConfig.password} onChange={(v) => setForm({ ...form, password: v })} type="password" />
            </>
          )}
          {configTab === 'ai' && (
            <>
              <ConfigField label="API Key" value={mergedConfig.apiKey} onChange={(v) => setForm({ ...form, apiKey: v })} type="password" />
              <ConfigField label="Base URL" value={mergedConfig.baseUrl} onChange={(v) => setForm({ ...form, baseUrl: v })} />
              <ConfigField label="Chat Model" value={mergedConfig.chatModel} onChange={(v) => setForm({ ...form, chatModel: v })} />
              <ConfigField label="Embedding Model" value={mergedConfig.embeddingModel} onChange={(v) => setForm({ ...form, embeddingModel: v })} />
              <ConfigField label="Max Tokens" value={mergedConfig.maxTokens} onChange={(v) => setForm({ ...form, maxTokens: Number(v) })} />
              <ConfigField label="Temperature" value={mergedConfig.temperature} onChange={(v) => setForm({ ...form, temperature: Number(v) })} />
            </>
          )}
          {configTab === 'storage' && (
            <>
              <ConfigField label="Upload Directory" value={mergedConfig.uploadDir} onChange={(v) => setForm({ ...form, uploadDir: v })} />
              <ConfigField label="Max File Size (bytes)" value={mergedConfig.maxFileSize} onChange={(v) => setForm({ ...form, maxFileSize: Number(v) })} />
            </>
          )}
        </div>

        {hasChanges && configTab !== 'branding' && (
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save & Push to Agent'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandingTab({
  client,
  saving,
  setSaving,
  onRefresh,
}: {
  client: Client;
  saving: boolean;
  setSaving: (s: boolean) => void;
  onRefresh: () => void;
}) {
  const branding = (client.branding as ClientBranding) || { title: 'Bitcoder Orchestrator', primaryColor: '#157382', logoUrl: null };
  const [title, setTitle] = useState(branding.title);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(branding.logoUrl || null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran logo maksimal 2MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClientBranding(client.id, {
        title: title || undefined,
        primaryColor: primaryColor || undefined,
        logoUrl: logoUrl || undefined,
      });
      onRefresh();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTitle('Bitcoder Orchestrator');
    setPrimaryColor('#157382');
    setLogoUrl('');
    setPreview(null);
    setLogoFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-blue-500" />
        <p className="text-xs text-blue-700">
          Kustomisasi ini mengubah tampilan sidebar dan judul aplikasi untuk pengguna di organisasi client ini.
          Brand "Powered by Bitcoder" dan "Bale Inovasi Teknologi" akan selalu ditampilkan.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="w-32 shrink-0 text-xs font-medium text-bc-text-muted">Company Logo</label>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-lg border border-bc-border bg-white flex items-center justify-center overflow-hidden shrink-0">
            {preview ? (
              <img src={preview} alt="Logo" className="h-8 w-8 object-contain" />
            ) : (
              <Image size={16} className="text-bc-text-muted" />
            )}
          </div>
          <label className="flex items-center gap-1.5 rounded-lg border border-bc-border px-3 py-1.5 text-xs text-bc-text-secondary hover:bg-bc-bg-dark cursor-pointer transition-colors">
            <Upload size={12} />
            Upload
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoChange} className="hidden" />
          </label>
          {preview && (
            <button
              onClick={() => { setPreview(null); setLogoUrl(''); setLogoFile(null); }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Hapus
            </button>
          )}
          <span className="text-[10px] text-bc-text-muted">PNG, JPG, SVG, WebP. Maks 2MB.</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="w-32 shrink-0 text-xs font-medium text-bc-text-muted">Judul Aplikasi</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. PT Maju Jaya AI Assistant"
          className="flex-1 rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-1.5 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="w-32 shrink-0 text-xs font-medium text-bc-text-muted">Warna Primary</label>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-8 w-8 rounded border border-bc-border cursor-pointer"
          />
          <input
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#157382"
            className="flex-1 rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-1.5 text-sm text-bc-text-dark font-mono placeholder-bc-text-muted outline-none focus:border-bc-primary"
          />
        </div>
      </div>

      <div className="rounded-lg border border-bc-border bg-white p-4">
        <p className="text-[10px] font-medium text-bc-text-muted uppercase tracking-wide mb-3">Preview Sidebar</p>
        <div className="rounded-lg border border-bc-border overflow-hidden" style={{ width: 220 }}>
          <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: `${primaryColor}20`, background: `${primaryColor}05` }}>
            {preview ? (
              <img src={preview} alt="Logo" className="h-6 w-6 object-contain rounded" />
            ) : (
              <div className="h-6 w-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: primaryColor }}>
                {(title || 'B')[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold truncate" style={{ color: `${primaryColor}dd` }}>{title || 'Bitcoder Orchestrator'}</span>
          </div>
          <div className="px-3 py-2 space-y-1">
            <div className="h-5 rounded text-[10px] flex items-center px-2 font-medium text-white" style={{ background: `${primaryColor}15`, color: primaryColor }}>Chat</div>
            <div className="h-5 rounded text-[10px] flex items-center px-2 text-gray-400">Admin Panel</div>
          </div>
          <div className="border-t px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] text-white" style={{ background: `${primaryColor}20`, color: primaryColor }}>A</div>
              <span className="text-[10px] text-gray-500 truncate">admin@company.com</span>
            </div>
          </div>
          <div className="border-t px-3 py-1.5 text-center">
            <span className="text-[8px] text-gray-400">Powered by <span className="font-medium">Bitcoder</span> · Bale Inovasi Teknologi</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark disabled:opacity-50 transition-all"
        >
          {saving ? 'Menyimpan...' : 'Simpan Branding'}
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-bc-border px-3 py-2 text-xs text-bc-text-secondary hover:bg-bc-bg-dark transition-all"
        >
          Reset ke Default
        </button>
      </div>
    </div>
  );
}

function ServiceCard({
  icon,
  name,
  status,
  detail,
}: {
  icon: React.ReactNode;
  name: string;
  status: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-bc-bg-dark px-3 py-2">
      <div className={clsx(
        'shrink-0',
        status === 'up' || status === 'ONLINE' ? 'text-green-500' :
        status === 'warning' ? 'text-yellow-500' :
        'text-gray-400',
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-bc-text-dark truncate">{name}</p>
        <p className={clsx(
          'text-[10px]',
          status === 'up' || status === 'ONLINE' ? 'text-green-600' :
          status === 'warning' ? 'text-yellow-600' :
          'text-gray-400',
        )}>
          {status === 'up' || status === 'ONLINE' ? 'Connected' :
           status === 'warning' ? 'Warning' :
           status === 'down' ? 'Down' : status}
          {detail && ` · ${detail}`}
        </p>
      </div>
    </div>
  );
}

function ConfigField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-32 shrink-0 text-xs font-medium text-bc-text-muted">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-1.5 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
      />
    </div>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
