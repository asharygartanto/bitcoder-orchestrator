import React, { useEffect, useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { useAuthStore } from '../stores/auth.store';
import { crawlUrl, getCrawlJobStatus, deleteCrawlSession, type CrawlJobStatus } from '../services/monitor';
import { getDocumentsByContext, deleteDocument } from '../services/document';
import { getContexts } from '../services/context';
import type { Context, Document } from '../types';
import {
  Globe,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  Link,
  Layers,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface CrawlResult {
  url: string;
  title: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  contentLength?: number;
  documentId?: string;
  pagesCrawled?: number;
  jobId?: string;
  sessionId?: string;
  error?: string;
}

type CrawlMode = 'single' | 'depth' | 'full';

interface ActiveJob {
  jobId: string;
  index: number;
  job?: CrawlJobStatus;
}

interface CrawlSession {
  sessionId: string;
  seedUrl: string;
  docs: Document[];
}

function extractSessionId(name: string): string | null {
  const m = name.match(/\[CRAWL:(cs_\w+)\]/);
  return m ? m[1] : null;
}

function extractLegacyUrl(name: string): string | null {
  if (name.includes('[CRAWL:')) return null;
  return name.replace('[CRAWL]', '').trim();
}

export default function NewsCrawlPage() {
  const { user } = useAuthStore();

  const [contexts, setContexts] = useState<Context[]>([]);
  const [contextId, setContextId] = useState('');
  const [urls, setUrls] = useState<CrawlResult[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [crawlMode, setCrawlMode] = useState<CrawlMode>('single');
  const [maxDepth, setMaxDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Map<number, ActiveJob>>(new Map());
  const [sessions, setSessions] = useState<CrawlSession[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [legacyDocs, setLegacyDocs] = useState<Document[]>([]);
  const pollRef = useRef<number | null>(null);

  const loadCrawledDocs = useCallback(async () => {
    try {
      const docs = await getDocumentsByContext(contextId);
      const crawlDocs = docs.filter((d) => d.name.includes('[CRAWL'));

      const sessionMap = new Map<string, CrawlSession>();
      const legacies: Document[] = [];

      for (const doc of crawlDocs) {
        const sid = extractSessionId(doc.name);
        if (sid) {
          if (!sessionMap.has(sid)) sessionMap.set(sid, { sessionId: sid, seedUrl: '', docs: [] });
          sessionMap.get(sid)!.docs.push(doc);
        } else {
          legacies.push(doc);
        }
      }

      for (const [, s] of sessionMap) {
        s.docs.sort((a, b) => a.name.localeCompare(b.name));
        if (!s.seedUrl && s.docs.length > 0) {
          s.seedUrl = s.docs[0].name.replace(/\[CRAWL:\w+\]\s*/, '');
        }
      }

      setSessions(Array.from(sessionMap.values()));
      setLegacyDocs(legacies);
    } catch {}
  }, [contextId]);

  useEffect(() => {
    getContexts().then(setContexts).catch(() => {});
  }, []);

  useEffect(() => {
    if (contextId) loadCrawledDocs();
  }, [contextId, loadCrawledDocs]);

  useEffect(() => {
    if (activeJobs.size === 0) return;
    pollRef.current = setInterval(pollJobs, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeJobs.size]);

  const pollJobs = useCallback(async () => {
    const updates = new Map<number, ActiveJob>();
    let anyRunning = false;

    for (const [idx, aj] of activeJobs) {
      try {
        const job = await getCrawlJobStatus(aj.jobId);
        updates.set(idx, { ...aj, job });
        if (job.status === 'running') anyRunning = true;
      } catch {
        updates.set(idx, aj);
      }
    }

    setActiveJobs(updates);

    if (!anyRunning) {
      if (pollRef.current) clearInterval(pollRef.current);
      loadCrawledDocs();
    }
  }, [activeJobs]);

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
    if (!contextId) {
      alert('Pilih context terlebih dahulu');
      return;
    }

    const updated = [...urls];
    updated[index] = { ...updated[index], status: 'loading' };
    setUrls(updated);

    try {
      const result = await crawlUrl({
        url: updated[index].url,
        title: updated[index].title,
        contextId,
        crawlMode,
        maxDepth: crawlMode === 'depth' ? maxDepth : undefined,
      });

      const done = [...updated];

      if (result.async) {
        done[index] = {
          ...done[index],
          status: 'success',
          jobId: result.jobId,
          sessionId: result.sessionId,
          pagesCrawled: 0,
        };
        setActiveJobs(new Map(activeJobs).set(index, { jobId: result.jobId, index }));
      } else {
        done[index] = {
          ...done[index],
          status: 'success',
          contentLength: result.contentLength,
          documentId: result.documentId,
          pagesCrawled: result.pagesCrawled,
          sessionId: result.sessionId,
        };
        loadCrawledDocs();
      }

      setUrls(done);
    } catch (err: any) {
      const failed = [...updated];
      failed[index] = { ...failed[index], status: 'error', error: err.response?.data?.message || err.message };
      setUrls(failed);
    }
  };

  const crawlAll = async () => {
    if (!contextId) {
      alert('Pilih context terlebih dahulu');
      return;
    }
    setLoading(true);
    for (let i = 0; i < urls.length; i++) {
      if (urls[i].status === 'success') continue;
      await crawlSingle(i);
    }
    setLoading(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Hapus semua hasil crawl dalam sesi ini?')) return;
    try {
      await deleteCrawlSession(contextId, sessionId);
      loadCrawledDocs();
    } catch {}
  };

  const handleDeleteSingleDoc = async (docId: string) => {
    try {
      await deleteDocument(docId);
      loadCrawledDocs();
    } catch {}
  };

  const handleDeleteLegacy = async (docId: string) => {
    if (!confirm('Hapus crawl ini?')) return;
    try {
      await deleteDocument(docId);
      loadCrawledDocs();
    } catch {}
  };

  const handleDeleteAllLegacy = async () => {
    if (!confirm(`Hapus semua ${legacyDocs.length} crawl lama?`)) return;
    for (const doc of legacyDocs) {
      try { await deleteDocument(doc.id); } catch {}
    }
    loadCrawledDocs();
  };

  const toggleSession = (sid: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };

  const getJobProgress = (idx: number) => {
    const aj = activeJobs.get(idx);
    if (!aj?.job) return null;
    return aj.job;
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-bc-text-muted">Akses ditolak. Hanya Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-bc-text-dark flex items-center gap-2">
            <Globe size={20} className="text-bc-primary" />
            Crawl Berita dari URL
          </h1>
          <p className="text-xs text-bc-text-muted mt-1">
            Masukkan URL berita/artikel, konten akan diekstrak dan disimpan ke database vektor untuk AI.
          </p>
        </div>

        <div className="rounded-xl border border-bc-border bg-bc-bg-muted/50 p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-bc-text-dark mb-1.5 block">Target Context</label>
            <select
              value={contextId}
              onChange={(e) => setContextId(e.target.value)}
              className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary"
            >
              <option value="">-- Pilih Context --</option>
              {contexts.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>{ctx.name} ({ctx._count?.documents || 0} docs)</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-bc-text-dark flex items-center gap-1.5">
              <Layers size={12} /> Mode Crawl
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCrawlMode('single')}
                className={clsx(
                  'rounded-lg border px-3 py-2.5 text-left transition-all',
                  crawlMode === 'single'
                    ? 'border-bc-primary bg-bc-primary/5 ring-1 ring-bc-primary/20'
                    : 'border-bc-border bg-white hover:border-bc-primary/30',
                )}
              >
                <p className="text-xs font-semibold text-bc-text-dark">Halaman Tunggal</p>
                <p className="text-[10px] text-bc-text-muted mt-0.5">Crawl hanya 1 halaman yang dimasukkan</p>
              </button>
              <button
                type="button"
                onClick={() => setCrawlMode('depth')}
                className={clsx(
                  'rounded-lg border px-3 py-2.5 text-left transition-all',
                  crawlMode === 'depth'
                    ? 'border-bc-primary bg-bc-primary/5 ring-1 ring-bc-primary/20'
                    : 'border-bc-border bg-white hover:border-bc-primary/30',
                )}
              >
                <p className="text-xs font-semibold text-bc-text-dark">Berdasarkan Kedalaman</p>
                <p className="text-[10px] text-bc-text-muted mt-0.5">Crawl halaman + link internal sesuai kedalaman</p>
              </button>
              <button
                type="button"
                onClick={() => setCrawlMode('full')}
                className={clsx(
                  'rounded-lg border px-3 py-2.5 text-left transition-all',
                  crawlMode === 'full'
                    ? 'border-bc-primary bg-bc-primary/5 ring-1 ring-bc-primary/20'
                    : 'border-bc-border bg-white hover:border-bc-primary/30',
                )}
              >
                <p className="text-xs font-semibold text-bc-text-dark">Crawl Penuh</p>
                <p className="text-[10px] text-bc-text-muted mt-0.5">Crawl seluruh halaman di domain yang sama (maks. 500)</p>
              </button>
            </div>

            {crawlMode === 'depth' && (
              <div className="flex items-center gap-3 rounded-lg border border-bc-border bg-white px-3 py-2">
                <label className="text-xs font-medium text-bc-text-dark whitespace-nowrap">Kedalaman Link:</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  className="flex-1 accent-bc-primary"
                />
                <span className="text-sm font-semibold text-bc-primary w-6 text-center">{maxDepth}</span>
                <span className="text-[10px] text-bc-text-muted">tingkat</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-bc-text-dark block">Tambah URL</label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                  placeholder="https://example.com/berita/artikel..."
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
                <span className="text-[10px] text-bc-text-muted">
                  Mode: <span className="font-medium text-bc-text-dark">
                    {crawlMode === 'single' ? 'Halaman Tunggal' : crawlMode === 'depth' ? `Kedalaman ${maxDepth} Tingkat` : 'Crawl Penuh'}
                  </span>
                </span>
                <button
                  onClick={crawlAll}
                  disabled={loading || !contextId}
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
              {urls.map((item, i) => {
                const job = getJobProgress(i);
                const isAsyncRunning = !!job && job.status === 'running';

                return (
                  <div key={i} className="rounded-xl border border-bc-border bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full shrink-0',
                        isAsyncRunning ? 'bg-blue-100' :
                        item.status === 'success' ? 'bg-green-100' :
                        item.status === 'error' ? 'bg-red-100' :
                        item.status === 'loading' ? 'bg-blue-100' :
                        'bg-gray-100',
                      )}>
                        {isAsyncRunning ? <Loader2 size={14} className="text-blue-500 animate-spin" /> :
                         item.status === 'success' ? <CheckCircle size={14} className="text-green-600" /> :
                         item.status === 'error' ? <XCircle size={14} className="text-red-500" /> :
                         item.status === 'loading' ? <Loader2 size={14} className="text-blue-500 animate-spin" /> :
                         <Link size={14} className="text-gray-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-bc-text-dark">{item.title}</p>
                        <p className="text-xs text-bc-primary truncate mt-0.5">{item.url}</p>

                        {isAsyncRunning && job && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-blue-600 font-medium">Sedang crawling...</span>
                              <span className="text-bc-text-muted">
                                {job.processed}/{job.totalFound} halaman ({job.succeeded} berhasil, {job.failed} gagal)
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full bg-bc-primary rounded-full transition-all duration-500"
                                style={{ width: `${job.totalFound > 0 ? (job.processed / job.totalFound) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {item.status === 'success' && !isAsyncRunning && job && (
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-bc-text-muted">
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle size={10} /> Selesai
                            </span>
                            <span className="flex items-center gap-1 text-bc-primary">
                              <Layers size={10} /> {job.succeeded} halaman berhasil
                            </span>
                            {job.failed > 0 && (
                              <span className="text-red-500">{job.failed} gagal</span>
                            )}
                          </div>
                        )}

                        {item.status === 'success' && !job && (
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-bc-text-muted">
                            <span className="flex items-center gap-1"><FileText size={10} /> {(item.contentLength || 0).toLocaleString()} chars</span>
                            {item.pagesCrawled && item.pagesCrawled > 1 && (
                              <span className="flex items-center gap-1 text-bc-primary"><Layers size={10} /> {item.pagesCrawled} halaman</span>
                            )}
                          </div>
                        )}

                        {item.status === 'error' && (
                          <p className="mt-1 text-xs text-red-500">{item.error}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.status !== 'loading' && item.status !== 'success' && !isAsyncRunning && (
                          <button
                            onClick={() => crawlSingle(i)}
                            disabled={!contextId}
                            className="rounded-lg px-3 py-1.5 text-xs text-bc-primary hover:bg-bc-primary/10 disabled:opacity-50"
                          >
                            Crawl
                          </button>
                        )}
                        <button
                          onClick={() => removeUrl(i)}
                          disabled={isAsyncRunning}
                          className="rounded-lg p-1.5 text-bc-text-muted hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-yellow-600" />
              <div className="text-xs text-yellow-800">
                <p className="font-medium">Catatan:</p>
                <ul className="mt-1 space-y-0.5 text-yellow-700">
                  <li>• <strong>Halaman Tunggal</strong> — hanya mengekstrak konten dari URL yang dimasukkan</li>
                  <li>• <strong>Berdasarkan Kedalaman</strong> — mengikuti link internal hingga kedalaman tertentu (berjalan di background)</li>
                  <li>• <strong>Crawl Penuh</strong> — menjelajahi seluruh domain (berjalan di background, maks. 500 halaman)</li>
                  <li>• Konten otomatis di-chunk dan di-vectorisasi</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {(sessions.length > 0 || legacyDocs.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-bc-text-dark flex items-center gap-2">
                <Globe size={16} className="text-bc-primary" />
                Hasil Crawl Tersimpan
              </h3>
              <button
                onClick={() => loadCrawledDocs()}
                className="rounded-lg p-1.5 text-bc-text-muted hover:bg-bc-bg-muted"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {sessions.map((session) => {
              const isExpanded = expandedSessions.has(session.sessionId);
              const readyCount = session.docs.filter((d) => d.status === 'READY').length;

              return (
                <div key={session.sessionId} className="rounded-xl border border-bc-border bg-white overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-bc-bg-subtle/50">
                    <button onClick={() => toggleSession(session.sessionId)} className="text-bc-text-muted shrink-0">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bc-primary/10 shrink-0">
                      <Layers size={12} className="text-bc-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-bc-text-dark truncate">{session.seedUrl || 'Crawl Session'}</p>
                      <p className="text-[10px] text-bc-text-muted">
                        {session.docs.length} halaman · {readyCount} ready · ID: {session.sessionId.slice(0, 16)}...
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSession(session.sessionId)}
                      className="shrink-0 rounded-lg px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 font-medium"
                    >
                      Hapus Semua
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-bc-border">
                      {session.docs.map((doc) => (
                        <div key={doc.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-bc-bg-subtle/30">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-primary/5 shrink-0">
                            {doc.status === 'READY' ? <CheckCircle size={10} className="text-green-500" /> : <Loader2 size={10} className="text-blue-400 animate-spin" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-bc-text-dark truncate">
                              {doc.name.replace(/\[CRAWL:\w+\]\s*/, '')}
                            </p>
                            <p className="text-[10px] text-bc-text-muted">
                              {doc.status === 'READY' ? `${doc.vectorCount} chunks` : doc.status}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteSingleDoc(doc.id)}
                            className="shrink-0 rounded p-1 text-bc-text-muted hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {legacyDocs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-bc-text-muted font-medium">Crawl Lama (tanpa sesi) — {legacyDocs.length} item</p>
                  <button
                    onClick={handleDeleteAllLegacy}
                    className="rounded-lg px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 font-medium"
                  >
                    Hapus Semua
                  </button>
                </div>
                {legacyDocs.map((doc) => (
                  <div key={doc.id} className="group flex items-center gap-3 rounded-xl border border-bc-border bg-white p-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bc-primary/10 shrink-0">
                      <Globe size={12} className="text-bc-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-bc-text-dark truncate">{extractLegacyUrl(doc.name)}</p>
                      <p className="text-[10px] text-bc-text-muted">
                        {doc.status === 'READY' ? <span className="text-green-600">{doc.vectorCount} chunks · Ready</span> : doc.status}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteLegacy(doc.id)}
                      className="shrink-0 rounded-lg p-1 text-bc-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
