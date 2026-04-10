import React, { useEffect, useState } from 'react';
import {
  uploadDocument,
  getDocumentsByContext,
  getDocumentStatus,
  deleteDocument,
  replaceDocument,
  reindexContext,
} from '../../services/document';
import {
  getApiConfigs,
  createApiConfig,
  updateApiConfig,
  deleteApiConfig,
} from '../../services/api-config';
import type { Document, ApiConfig, ProcessingStatus } from '../../types';
import DocumentList from './DocumentList';
import ApiConfigList from './ApiConfigList';
import TestChatBox from './TestChatBox';
import { Upload, Zap, MessageSquare, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  context: any;
  onUpdate: () => void;
}

type Tab = 'documents' | 'apis' | 'test';

export default function ContextPanel({ context, onUpdate }: Props) {
  const [tab, setTab] = useState<Tab>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ProcessingStatus>>({});
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    loadData();
  }, [context.id]);

  useEffect(() => {
    const hasProcessing = Object.values(statuses).some(
      (s) => s.status !== 'ready' && s.status !== 'error',
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      pollStatuses();
    }, 3000);
    return () => clearInterval(interval);
  }, [statuses]);

  const loadData = async () => {
    try {
      const [docs, apis] = await Promise.all([
        getDocumentsByContext(context.id),
        getApiConfigs(context.id),
      ]);
      setDocuments(docs);
      setApiConfigs(apis);
      pollStatuses();
    } catch {}
  };

  const pollStatuses = async () => {
    const newStatuses: Record<string, ProcessingStatus> = {};
    for (const doc of documents) {
      if (doc.status !== 'READY') {
        try {
          const status = await getDocumentStatus(doc.id);
          newStatuses[doc.id] = status;
        } catch {}
      }
    }
    if (Object.keys(newStatuses).length > 0) {
      setStatuses((prev) => ({ ...prev, ...newStatuses }));
    }
  };

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        await uploadDocument(context.id, file, file.name);
      } catch {}
    }
    setUploading(false);
    loadData();
    onUpdate();
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      onUpdate();
    } catch {}
  };

  const handleReplaceDoc = async (id: string, file: File) => {
    try {
      await replaceDocument(id, file, file.name);
      loadData();
    } catch {}
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await reindexContext(context.id);
      loadData();
    } catch {} finally {
      setReindexing(false);
    }
  };

  const handleCreateApi = async (config: Partial<ApiConfig>) => {
    try {
      await createApiConfig(context.id, config);
      loadData();
    } catch {}
  };

  const handleUpdateApi = async (id: string, config: Partial<ApiConfig>) => {
    try {
      await updateApiConfig(id, config);
      loadData();
    } catch {}
  };

  const handleDeleteApi = async (id: string) => {
    if (!confirm('Delete this API configuration?')) return;
    try {
      await deleteApiConfig(id);
      setApiConfigs(apiConfigs.filter((a) => a.id !== id));
    } catch {}
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'documents', label: 'Documents', icon: <Upload size={16} /> },
    { key: 'apis', label: 'APIs', icon: <Zap size={16} /> },
    { key: 'test', label: 'Test Chat', icon: <MessageSquare size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[hsl(var(--border))] bg-surface-1 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{context.name}</h2>
            {context.description && (
              <p className="mt-0.5 text-sm text-text-tertiary">{context.description}</p>
            )}
          </div>
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary transition-all hover:bg-surface-3 disabled:opacity-50"
          >
            <RefreshCw size={14} className={reindexing ? 'animate-spin' : ''} />
            {reindexing ? 'Re-indexing...' : 'Re-index All'}
          </button>
        </div>

        <div className="mt-4 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                tab === t.key
                  ? 'bg-accent/10 text-accent-light'
                  : 'text-text-tertiary hover:bg-surface-3 hover:text-text-secondary',
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'documents' && (
          <DocumentList
            documents={documents}
            statuses={statuses}
            uploading={uploading}
            onUpload={handleUpload}
            onDelete={handleDeleteDoc}
            onReplace={handleReplaceDoc}
          />
        )}
        {tab === 'apis' && (
          <ApiConfigList
            configs={apiConfigs}
            onCreate={handleCreateApi}
            onUpdate={handleUpdateApi}
            onDelete={handleDeleteApi}
          />
        )}
        {tab === 'test' && (
          <TestChatBox contextId={context.id} />
        )}
      </div>
    </div>
  );
}
