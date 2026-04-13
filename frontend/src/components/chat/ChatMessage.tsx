import ReactMarkdown from 'react-markdown';
import { Bot, FileText, ExternalLink, Download, Globe } from 'lucide-react';
import clsx from 'clsx';
import type { ChatMessage as ChatMessageType, SourceReference } from '../../types';

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

function getDownloadUrl(documentId: string): string {
  const token = localStorage.getItem('bitcoder_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  return `${baseUrl}/api/doc/download/${documentId}?token=${token}`;
}

export default function ChatMessage({ message, isStreaming }: Props) {
  const isUser = message.role === 'USER';
  const references = message.references;
  const sources = !isUser && references?.sources ? references.sources : [];

  return (
    <div className={clsx('animate-slide-up', isUser ? 'flex justify-end' : '')}>
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-bc-primary/10 text-bc-text-dark rounded-br-md'
            : 'bg-bc-bg-muted text-bc-text-dark rounded-bl-md border border-bc-border',
        )}
      >
        <div className="flex items-start gap-3">
          {!isUser && (
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bc-primary/10">
              <Bot size={14} className="text-bc-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="prose prose-sm max-w-none text-sm leading-relaxed text-bc-text-dark">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            {isStreaming && (
              <span className="inline-flex items-center gap-0.5 mt-1">
                <span className="inline-block h-4 w-0.5 bg-bc-primary rounded-full animate-dot-wave" style={{ animationDelay: '0ms' }} />
                <span className="inline-block h-4 w-0.5 bg-bc-primary/70 rounded-full animate-dot-wave" style={{ animationDelay: '120ms' }} />
                <span className="inline-block h-4 w-0.5 bg-bc-primary/40 rounded-full animate-dot-wave" style={{ animationDelay: '240ms' }} />
              </span>
            )}

            {sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-bc-border space-y-1.5">
                {Array.from(
                  new Map(sources.map((s) => [s.document_id, s])).values(),
                ).map((source) => (
                  <div key={source.document_id}>
                    {source.source_type === 'crawl' && source.source_url ? (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-bc-primary/8 border border-bc-primary/20 px-3 py-2 text-xs font-medium text-bc-primary hover:bg-bc-primary/15 transition-colors"
                      >
                        <Globe size={14} className="shrink-0" />
                        <span className="truncate">{source.source_url}</span>
                        <ExternalLink size={12} className="shrink-0 ml-1" />
                      </a>
                    ) : (
                      <a
                        href={getDownloadUrl(source.document_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-bc-primary/8 border border-bc-primary/20 px-3 py-2 text-xs font-medium text-bc-primary hover:bg-bc-primary/15 transition-colors"
                      >
                        <FileText size={14} className="shrink-0" />
                        <span className="truncate">{source.document_name}</span>
                        <Download size={12} className="shrink-0 ml-1" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
