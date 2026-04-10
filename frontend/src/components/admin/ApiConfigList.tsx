import { useState } from 'react';
import { Zap, Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import clsx from 'clsx';
import type { ApiConfig } from '../../types';

interface Props {
  configs: ApiConfig[];
  onCreate: (config: Partial<ApiConfig>) => void;
  onUpdate: (id: string, config: Partial<ApiConfig>) => void;
  onDelete: (id: string) => void;
}

export default function ApiConfigList({ configs, onCreate, onUpdate, onDelete }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    endpoint: '',
    method: 'GET' as ApiConfig['method'],
    headers: '{}',
    bodyTemplate: '{}',
  });

  const resetForm = () => {
    setForm({ name: '', description: '', endpoint: '', method: 'GET', headers: '{}', bodyTemplate: '{}' });
  };

  const handleCreate = () => {
    if (!form.name || !form.endpoint) return;
    let headers = {};
    let bodyTemplate = {};
    try { headers = JSON.parse(form.headers); } catch {}
    try { bodyTemplate = JSON.parse(form.bodyTemplate); } catch {}

    onCreate({
      name: form.name,
      description: form.description || undefined,
      endpoint: form.endpoint,
      method: form.method,
      headers,
      bodyTemplate,
    });
    resetForm();
    setShowCreate(false);
  };

  const startEdit = (config: ApiConfig) => {
    setEditingId(config.id);
    setForm({
      name: config.name,
      description: config.description || '',
      endpoint: config.endpoint,
      method: config.method,
      headers: JSON.stringify(config.headers || {}, null, 2),
      bodyTemplate: JSON.stringify(config.bodyTemplate || {}, null, 2),
    });
  };

  const handleUpdate = () => {
    if (!editingId) return;
    let headers = {};
    let bodyTemplate = {};
    try { headers = JSON.parse(form.headers); } catch {}
    try { bodyTemplate = JSON.parse(form.bodyTemplate); } catch {}

    onUpdate(editingId, {
      name: form.name,
      description: form.description || undefined,
      endpoint: form.endpoint,
      method: form.method,
      headers,
      bodyTemplate,
    });
    setEditingId(null);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-bc-text-dark">API Configurations</h3>
        <button
          onClick={() => { setShowCreate(!showCreate); resetForm(); }}
          className="flex items-center gap-2 rounded-lg bg-bc-primary px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-bc-primary-dark"
        >
          <Plus size={14} /> Add API
        </button>
      </div>

      {showCreate && (
        <ApiForm
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onCancel={() => { setShowCreate(false); resetForm(); }}
          submitLabel="Create API Config"
        />
      )}

      {configs.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-bc-border bg-bc-bg-muted/30 py-12">
          <Zap size={32} className="mb-3 text-bc-text-muted" />
          <p className="text-sm text-bc-text-secondary">No API configurations yet</p>
          <p className="mt-1 text-xs text-bc-text-muted">
            Add external APIs to enrich RAG context
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div key={config.id}>
              {editingId === config.id ? (
                <div className="rounded-xl border border-bc-primary/30 bg-bc-bg-muted p-4 space-y-3">
                  <ApiForm
                    form={form}
                    setForm={setForm}
                    onSubmit={handleUpdate}
                    onCancel={() => { setEditingId(null); resetForm(); }}
                    submitLabel="Update"
                  />
                </div>
              ) : (
                <div className="group flex items-center gap-3 rounded-xl border border-bc-border bg-bc-bg-muted px-4 py-3 transition-all hover:border-bc-border-hover">
                  <div className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                    config.isActive ? 'bg-bc-secondary/10 text-bc-secondary' : 'bg-bc-border text-bc-text-muted',
                  )}>
                    {config.method}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-bc-text-dark">{config.name}</p>
                    <p className="truncate text-xs text-bc-text-muted">{config.endpoint}</p>
                    {config.description && (
                      <p className="mt-0.5 text-xs text-bc-text-muted">{config.description}</p>
                    )}
                  </div>
                  <span className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    config.isActive ? 'bg-bc-secondary/10 text-bc-secondary' : 'bg-bc-border text-bc-text-muted',
                  )}>
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(config)}
                      className="rounded-lg p-1.5 text-bc-text-muted hover:bg-bc-border hover:text-bc-text-secondary transition-all"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(config.id)}
                      className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-bc-border bg-bc-bg-muted/50 p-4">
        <p className="text-xs font-medium text-bc-text-muted mb-2">Test API Reference</p>
        <p className="text-xs text-bc-text-muted">
          For testing, use the built-in Cuti API:
        </p>
        <code className="mt-1 block rounded-lg bg-bc-bg-dark px-3 py-2 text-xs text-bc-primary">
          http://localhost:8090/api/leave/balance
        </code>
        <p className="mt-2 text-xs text-bc-text-muted">
          Method: <span className="text-bc-text-secondary">POST</span> · Body: <code className="text-bc-primary">{'{"emp_id": "EMP001"}'}</code>
        </p>
        <p className="mt-1 text-xs text-bc-text-muted">
          Or GET with query: <code className="text-bc-primary">?emp_id=EMP001</code>
        </p>
      </div>
    </div>
  );
}

function ApiForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: any;
  setForm: (f: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="API Name (e.g. Leave Balance API)"
          className="col-span-2 rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-2 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
        />
        <input
          value={form.endpoint}
          onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
          placeholder="Endpoint URL"
          className="col-span-2 rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-2 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
        />
        <select
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
          className="rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-2 text-sm text-bc-text-dark outline-none focus:border-bc-primary"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
        </select>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optional)"
          className="rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-2 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
        />
        <textarea
          value={form.headers}
          onChange={(e) => setForm({ ...form, headers: e.target.value })}
          placeholder='Headers JSON (e.g. {"Authorization": "Bearer ..."}'
          rows={2}
          className="col-span-2 rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-2 text-xs text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary font-mono"
        />
        <textarea
          value={form.bodyTemplate}
          onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
          placeholder='Body Template JSON (e.g. {"emp_id": "EMP001"}'
          rows={3}
          className="col-span-2 rounded-lg border border-bc-border bg-bc-bg-dark px-3 py-2 text-xs text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary font-mono"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          className="flex items-center gap-1 rounded-lg bg-bc-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-bc-primary-dark transition-all"
        >
          <Check size={14} /> {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg border border-bc-border px-3 py-1.5 text-xs text-bc-text-secondary hover:bg-bc-bg-dark transition-all"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
