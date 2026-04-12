import React, { useEffect, useState } from 'react';
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
} from '../services/api-key';
import type { ApiKeyItem } from '../services/api-key';
import {
  Plus,
  Key,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
  Code,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
} from 'lucide-react';
import clsx from 'clsx';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [createdKey, setCreatedKey] = useState<{ id: string; key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const loadKeys = async () => {
    try {
      const data = await getApiKeys();
      setKeys(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const result = await createApiKey(newName.trim());
      setCreatedKey({ id: result.id, key: result.key!, name: result.name });
      setNewName('');
      setShowCreate(false);
      loadKeys();
    } catch {}
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateApiKey(id, { isActive: !isActive });
      loadKeys();
    } catch {}
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus API key "${name}"? Aplikasi yang menggunakan key ini akan terputus.`)) return;
    try {
      await deleteApiKey(id);
      loadKeys();
    } catch {}
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseUrl = window.location.origin;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-bc-border px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-bc-text-dark">API Keys</h1>
          <p className="text-xs text-bc-text-muted mt-0.5">Kelola API key untuk integrasi mobile app atau sistem lain</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadKeys}
            className="rounded-lg p-2 text-bc-text-muted hover:bg-bc-bg-muted transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowDocs(!showDocs)}
            className={clsx(
              'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              showDocs ? 'bg-bc-primary text-white border-bc-primary' : 'border-bc-border text-bc-text-secondary hover:bg-bc-bg-muted',
            )}
          >
            <Code size={12} /> API Docs
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 rounded-lg bg-bc-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-bc-primary-dark transition-all"
          >
            <Plus size={12} /> Buat Key
          </button>
        </div>
      </div>

      {createdKey && (
        <div className="border-b border-bc-border px-6 py-3 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">API Key berhasil dibuat untuk "{createdKey.name}"</p>
              <p className="text-xs text-green-700 mt-1 font-mono bg-green-100 px-2 py-1 rounded inline-block">{createdKey.key}</p>
              <p className="text-[10px] text-green-600 mt-1">Salin sekarang. Key ini tidak akan ditampilkan lagi.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(createdKey.key)}
                className="flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100"
              >
                {copied ? <><Check size={12} /> Tersalin</> : <><Copy size={12} /> Salin</>}
              </button>
              <button onClick={() => setCreatedKey(null)} className="text-green-600 hover:text-green-800">
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && !createdKey && (
        <div className="border-b border-bc-border px-6 py-4 bg-bc-bg-subtle">
          <div className="flex items-center gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nama API key (e.g. Mobile App, Sistem HRD)"
              className="flex-1 rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary"
            />
            <button
              onClick={handleCreate}
              className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark"
            >
              Buat
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); }}
              className="rounded-lg border border-bc-border px-3 py-2 text-xs text-bc-text-secondary"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {showDocs && (
        <div className="border-b border-bc-border bg-bc-bg-subtle overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <div className="p-6 space-y-6 max-w-4xl">
            <div>
              <h3 className="text-sm font-bold text-bc-text-dark mb-2">Dokumentasi Public API</h3>
              <p className="text-xs text-bc-text-muted mb-4">
                Semua endpoint menggunakan autentikasi API key. Sertakan API key di salah satu cara berikut:
              </p>
              <div className="rounded-lg border border-bc-border bg-white p-4 space-y-3 font-mono text-xs">
                <div>
                  <p className="text-bc-text-muted font-sans text-[10px] uppercase tracking-wide mb-1">Header (direkomendasikan)</p>
                  <code className="text-bc-primary">x-api-key: bc_your_api_key_here</code>
                </div>
                <div>
                  <p className="text-bc-text-muted font-sans text-[10px] uppercase tracking-wide mb-1">Authorization header</p>
                  <code className="text-bc-primary">Authorization: ApiKey bc_your_api_key_here</code>
                </div>
                <div>
                  <p className="text-bc-text-muted font-sans text-[10px] uppercase tracking-wide mb-1">Query parameter</p>
                  <code className="text-bc-primary">?api_key=bc_your_api_key_here</code>
                </div>
              </div>
            </div>

            <EndpointDoc
              method="GET"
              path="/api/public/info"
              desc="Informasi organisasi dan daftar endpoint yang tersedia"
              baseUrl={baseUrl}
            />

            <EndpointDoc
              method="GET"
              path="/api/public/health"
              desc="Cek status koneksi API"
              baseUrl={baseUrl}
            />

            <EndpointDoc
              method="POST"
              path="/api/public/auth/login"
              desc="Login user dengan email & password. Mengembalikan JWT token untuk identifikasi user."
              baseUrl={baseUrl}
              body={`{
  "email": "user@company.com",
  "password": "password123"
}`}
              response={`{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clx...",
    "email": "user@company.com",
    "name": "User",
    "role": "USER"
  }
}`}
            />

            <EndpointDoc
              method="GET"
              path="/api/public/contexts"
              desc="Daftar semua knowledge context yang aktif"
              baseUrl={baseUrl}
              response={`[
  {
    "id": "clx...",
    "name": "Kebijakan Cuti",
    "description": "Konteks tentang kebijakan cuti perusahaan",
    "isActive": true,
    "_count": { "documents": 5, "apiConfigs": 2 }
  }
]`}
            />

            <EndpointDoc
              method="POST"
              path="/api/public/chat"
              desc="Kirim pesan dan dapatkan jawaban AI berdasarkan dokumen yang terindex. Opsional: tentukan contextId untuk membatasi pencarian."
              baseUrl={baseUrl}
              body={`{
  "message": "Berapa sisa cuti saya?",
  "contextId": "clx..." 
}`}
              response={`{
  "answer": "Berdasarkan data, sisa cuti annual Anda adalah 9 hari...",
  "sources": [
    {
      "document_name": "Kebijakan_Cuti_2025.pdf",
      "score": 0.89,
      "content": "..."
    }
  ],
  "api_results": [
    {
      "api_name": "Leave Balance API",
      "data": { "annual_leave": { "remaining": 9 } }
    }
  ],
  "timestamp": "2025-01-01T00:00:00.000Z"
}`}
            />

            <EndpointDoc
              method="POST"
              path="/api/public/chat/stream"
              desc="Chat dengan streaming response (SSE). Format: Server-Sent Events. Data diakhiri dengan [DONE]."
              baseUrl={baseUrl}
              body={`{
  "message": "Jelaskan kebijakan cuti",
  "contextId": "clx..."
}`}
              response={`data: {"chunk": "Berdasarkan "}
data: {"chunk": "kebijakan cuti "}
data: {"chunk": "perusahaan..."}
data: [DONE]`}
            />

            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
              <h4 className="text-xs font-bold text-blue-800 mb-2">Contoh Integrasi</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide mb-1">cURL</p>
                  <pre className="bg-blue-100 rounded px-3 py-2 text-[11px] text-blue-900 overflow-x-auto">{`curl -X POST ${baseUrl}/api/public/chat \\
  -H "x-api-key: bc_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Berapa sisa cuti saya?"}'`}</pre>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide mb-1">JavaScript / Mobile</p>
                  <pre className="bg-blue-100 rounded px-3 py-2 text-[11px] text-blue-900 overflow-x-auto">{`const res = await fetch('${baseUrl}/api/public/chat', {
  method: 'POST',
  headers: {
    'x-api-key': 'bc_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Berapa sisa cuti saya?',
  }),
});
const data = await res.json();
console.log(data.answer);`}</pre>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide mb-1">Python</p>
                  <pre className="bg-blue-100 rounded px-3 py-2 text-[11px] text-blue-900 overflow-x-auto">{`import requests

resp = requests.post(
    "${baseUrl}/api/public/chat",
    headers={"x-api-key": "bc_your_api_key"},
    json={"message": "Berapa sisa cuti saya?"}
)
print(resp.json()["answer"])`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="text-center text-xs text-bc-text-muted py-12">Memuat...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12">
            <Key size={32} className="mx-auto mb-3 text-bc-text-muted" />
            <h3 className="text-sm font-semibold text-bc-text-secondary">Belum ada API Key</h3>
            <p className="mt-1 text-xs text-bc-text-muted max-w-md mx-auto">
              Buat API key untuk mengizinkan aplikasi mobile atau sistem lain mengakses API Bitcoder.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="rounded-xl border border-bc-border bg-white p-4 flex items-center gap-4"
              >
                <div className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                  key.isActive ? 'bg-green-100' : 'bg-red-100',
                )}>
                  <Key size={18} className={key.isActive ? 'text-green-600' : 'text-red-400'} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-bc-text-dark">{key.name}</p>
                    <span className={clsx(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      key.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                    )}>
                      {key.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-bc-text-muted">
                    <span className="font-mono">{key.prefix}••••••••</span>
                    <span>·</span>
                    <span>Dibuat oleh {key.createdBy?.name || key.createdBy?.email}</span>
                    <span>·</span>
                    <span>{new Date(key.createdAt).toLocaleDateString('id-ID')}</span>
                    {key.lastUsedAt && (
                      <>
                        <span>·</span>
                        <span>Terakhir dipakai {new Date(key.lastUsedAt).toLocaleDateString('id-ID')}</span>
                      </>
                    )}
                    {key.expiresAt && (
                      <>
                        <span>·</span>
                        <span className={new Date(key.expiresAt) < new Date() ? 'text-red-500' : ''}>
                          {new Date(key.expiresAt) < new Date() ? 'Kadaluarsa' : `Berlaku hingga ${new Date(key.expiresAt).toLocaleDateString('id-ID')}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(key.id, key.isActive)}
                    className="rounded-lg px-3 py-1.5 text-xs text-bc-text-secondary hover:bg-bc-bg-muted transition-colors"
                  >
                    {key.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(key.id, key.name)}
                    className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EndpointDoc({
  method,
  path,
  desc,
  baseUrl,
  body,
  response,
}: {
  method: string;
  path: string;
  desc: string;
  baseUrl: string;
  body?: string;
  response?: string;
}) {
  const methodColor: Record<string, string> = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="rounded-lg border border-bc-border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bc-border bg-bc-bg-subtle">
        <span className={clsx('rounded px-2 py-0.5 text-[10px] font-bold', methodColor[method] || 'bg-gray-100 text-gray-700')}>
          {method}
        </span>
        <code className="text-xs text-bc-text-dark font-mono">{path}</code>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-xs text-bc-text-secondary">{desc}</p>

        {body && (
          <div>
            <p className="text-[10px] font-medium text-bc-text-muted uppercase tracking-wide mb-1">Request Body</p>
            <pre className="bg-bc-bg-dark rounded-lg px-3 py-2 text-[11px] text-bc-primary font-mono overflow-x-auto">{body}</pre>
          </div>
        )}

        {response && (
          <div>
            <p className="text-[10px] font-medium text-bc-text-muted uppercase tracking-wide mb-1">Response</p>
            <pre className="bg-bc-bg-dark rounded-lg px-3 py-2 text-[11px] text-bc-text-dark font-mono overflow-x-auto max-h-48 overflow-y-auto">{response}</pre>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const curl = `curl -X ${method} ${baseUrl}${path}${body ? ` \\\n  -H "x-api-key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'` : ` \\\n  -H "x-api-key: YOUR_KEY"`}`;
              navigator.clipboard.writeText(curl);
            }}
            className="flex items-center gap-1 rounded border border-bc-border px-2 py-1 text-[10px] text-bc-text-secondary hover:bg-bc-bg-muted transition-colors"
          >
            <Copy size={10} /> Copy cURL
          </button>
        </div>
      </div>
    </div>
  );
}
