import React, { useEffect, useState } from 'react';
import { getContexts, createContext, deleteContext } from '../services/context';
import type { Context } from '../types';
import ContextPanel from '../components/admin/ContextPanel';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function AdminPage() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [activeContext, setActiveContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadContexts = async () => {
    try {
      const data = await getContexts();
      setContexts(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContexts();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const ctx = await createContext(newName.trim(), newDesc.trim() || undefined);
      setContexts([ctx, ...contexts]);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this context and all its documents/APIs?')) return;
    try {
      await deleteContext(id);
      setContexts(contexts.filter((c) => c.id !== id));
      if (activeContext?.id === id) setActiveContext(null);
    } catch {}
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-[hsl(var(--border))] bg-surface-1 flex flex-col">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Knowledge Contexts</h2>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent-light transition-all hover:bg-accent/20"
            >
              <Plus size={14} /> New
            </button>
          </div>

          {showCreate && (
            <div className="space-y-2 animate-slide-up">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Context name (e.g. Cuti)"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent/50"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 rounded-lg bg-accent py-1.5 text-xs font-semibold text-white hover:bg-accent-dark transition-all"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}
                  className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-3 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-xs text-text-muted">Loading...</div>
          ) : contexts.length === 0 ? (
            <div className="p-4 text-center">
              <FolderOpen size={24} className="mx-auto mb-2 text-text-muted" />
              <p className="text-xs text-text-muted">No contexts yet. Create one above.</p>
            </div>
          ) : (
            contexts.map((ctx) => (
              <div
                key={ctx.id}
                className={clsx(
                  'group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all',
                  activeContext?.id === ctx.id
                    ? 'bg-accent/10 text-accent-light glow-border'
                    : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary',
                )}
                onClick={() => setActiveContext(ctx)}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{ctx.name}</p>
                  <p className="truncate text-xs text-text-muted">
                    {ctx._count?.documents || 0} docs · {ctx._count?.apiConfigs || 0} APIs
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ctx.id); }}
                  className="shrink-0 rounded p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeContext ? (
          <ContextPanel context={activeContext} onUpdate={loadContexts} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FolderOpen size={48} className="mx-auto mb-3 text-text-muted" />
              <h3 className="text-lg font-semibold text-text-secondary">Select a Context</h3>
              <p className="mt-1 text-sm text-text-muted">
                Choose or create a context to manage documents and API configurations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
