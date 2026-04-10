import React, { useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Database,
} from 'lucide-react';
import clsx from 'clsx';
import type { Document, ProcessingStatus } from '../../types';

interface Props {
  documents: Document[];
  statuses: Record<string, ProcessingStatus>;
  uploading: boolean;
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
}

interface StatusConfig {
  icon: React.ReactNode;
  color: string;
  label: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  UPLOADED: { icon: <Upload size={14} />, color: 'text-blue-400', label: 'Uploaded' },
  PROCESSING: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-yellow-400', label: 'Processing' },
  VECTORIZING: { icon: <Layers size={14} className="animate-pulse" />, color: 'text-purple-400', label: 'Vectorizing' },
  INDEXING: { icon: <Database size={14} className="animate-pulse" />, color: 'text-cyan-400', label: 'Indexing' },
  READY: { icon: <CheckCircle2 size={14} />, color: 'text-emerald-400', label: 'Ready' },
  ERROR: { icon: <AlertCircle size={14} />, color: 'text-red-400', label: 'Error' },
};

const DEFAULT_CFG: StatusConfig = STATUS_CONFIG.ERROR;

export default function DocumentList({
  documents,
  statuses,
  uploading,
  onUpload,
  onDelete,
  onReplace,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = React.useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

  const handleReplaceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && replaceId) {
      onReplace(replaceId, e.target.files[0]);
      setReplaceId(null);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Documents</h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-dark hover:shadow-glow disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={replaceRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          className="hidden"
          onChange={handleReplaceSelect}
        />
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-surface-2/30 py-12">
          <FileText size={32} className="mb-3 text-text-muted" />
          <p className="text-sm text-text-secondary">No documents uploaded yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Upload PDF, Word, TXT, or Markdown files
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-xs font-medium text-accent-light transition-all hover:bg-accent/20"
          >
            <Upload size={14} /> Upload First Document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const status = statuses[doc.id];
            const statusKey = status?.status?.toUpperCase() || doc.status;
            const cfg: StatusConfig = STATUS_CONFIG[statusKey] ?? DEFAULT_CFG;

            return (
              <div
                key={doc.id}
                className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-surface-2 px-4 py-3 transition-all hover:border-[hsl(var(--border-hover))] top-light"
              >
                <FileText size={20} className="shrink-0 text-accent" />

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{doc.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Layers size={10} /> {doc.vectorCount} chunks
                    </span>
                  </div>

                  {status && statusKey !== 'READY' && statusKey !== 'ERROR' && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cfg.color}>{cfg.icon}</span>
                        <span className="text-text-secondary">{status.phase}...</span>
                        <span className="text-text-muted">({status.progress}%)</span>
                      </div>
                      <div className="mt-1 h-1 w-full rounded-full bg-surface-4">
                        <div
                          className="h-1 rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">{status.message}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className={clsx('flex items-center gap-1 text-xs', cfg.color)}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setReplaceId(doc.id);
                      replaceRef.current?.click();
                    }}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-surface-4 hover:text-text-secondary transition-all"
                    title="Replace"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
