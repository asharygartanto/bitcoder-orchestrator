import React, { useState } from 'react';
import clsx from 'clsx';
import { crawlUrl } from '../../services/monitor';
import {
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Link,
} from 'lucide-react';

interface CrawlResult {
  url: string;
  title: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  contentLength?: number;
  documentId?: string;
  error?: string;
}

interface Props {
  contextId: string;
  onCrawlComplete: () => void;
}

export default function CrawlSiteTab({ contextId, onCrawlComplete }: Props) {
  const [urls, setUrls] = useState<CrawlResult[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const addUrl = () => {
    if (!newUrl.trim()) return;
    setUrls([...urls, { url: newUrl.trim(), title: newTitle.trim() || newUrl.trim(), status: 'idle' }]);
    setNewUrl('');
    setNewTitle('');
  };

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const crawlSingle = async (index: number) => {
    const updated = [...urls];
    updated[index] = { ...updated[index], status: 'loading' };
    setUrls(updated);

    try {
      const result = await crawlUrl({
        url: updated[index].url,
        title: updated[index].title,
        contextId,
      });
      const done = [...updated];
      done[index] = {
        ...done[index],
        status: 'success',
        contentLength: result.contentLength,
        documentId: result.documentId,
      };
      setUrls(done);
      onCrawlComplete();
    } catch (err: any) {
      const failed = [...updated];
      failed[index] = { ...failed[index], status: 'error', error: err.response?.data?.message || err.message };
      setUrls(failed);
    }
  };

  const crawlAll = async () => {
    setLoading(true);
    for (let i = 0; i < urls.length; i++) {
      if (urls[i].status === 'success') continue;
      await crawlSingle(i);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-xl border border-bc-border bg-bc-bg-muted/50 p-4 space-y-4">
        <div className="space-y-3">
          <label className="text-xs font-medium text-bc-text-dark block">Tambah URL</label>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                placeholder="https://example.com/artikel..."
                className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary"
              />
            </div>
            <div className="flex-1">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                placeholder="Judul (opsional)"
                className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary"
              />
            </div>
            <button onClick={addUrl} className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark whitespace-nowrap">
              <Plus size={14} className="inline -mt-0.5" /> Tambah
            </button>
          </div>
        </div>
      </div>

      {urls.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-bc-text-dark">Antrian URL ({urls.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={crawlAll}
                disabled={loading}
                className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 size={12} className="inline animate-spin -mt-0.5" /> Memproses...</>
                ) : 'Crawl Semua'}
              </button>
              <button
                onClick={() => setUrls([])}
                className="rounded-lg border border-bc-border px-3 py-2 text-xs text-bc-text-secondary hover:bg-bc-bg-muted"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {urls.map((item, i) => (
              <div key={i} className="rounded-xl border border-bc-border bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full shrink-0',
                    item.status === 'success' ? 'bg-green-100' :
                    item.status === 'error' ? 'bg-red-100' :
                    item.status === 'loading' ? 'bg-blue-100' :
                    'bg-gray-100',
                  )}>
                    {item.status === 'success' ? <CheckCircle size={14} className="text-green-600" /> :
                     item.status === 'error' ? <XCircle size={14} className="text-red-500" /> :
                     item.status === 'loading' ? <Loader2 size={14} className="text-blue-500 animate-spin" /> :
                     <Link size={14} className="text-gray-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-bc-text-dark">{item.title}</p>
                    <p className="text-xs text-bc-primary truncate mt-0.5">{item.url}</p>

                    {item.status === 'success' && (
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-bc-text-muted">
                        <span className="flex items-center gap-1"><FileText size={10} /> {(item.contentLength || 0).toLocaleString()} chars</span>
                        <span className="font-mono">{item.documentId}</span>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <p className="mt-1 text-xs text-red-500">{item.error}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.status !== 'loading' && item.status !== 'success' && (
                      <button
                        onClick={() => crawlSingle(i)}
                        className="rounded-lg px-3 py-1.5 text-xs text-bc-primary hover:bg-bc-primary/10"
                      >
                        Crawl
                      </button>
                    )}
                    <button
                      onClick={() => removeUrl(i)}
                      className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-yellow-600" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium">Catatan:</p>
              <ul className="mt-1 space-y-0.5 text-yellow-700">
                <li>• Pastikan URL mengandung konten yang dapat dibaca</li>
                <li>• Konten akan otomatis di-chunk dan di-vectorisasi</li>
                <li>• Hasil crawl ditandai dengan prefix [CRAWL] di nama dokumen</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
