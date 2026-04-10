import ReactMarkdown from 'react-markdown';
import { Bot, FileText, ExternalLink, Download } from 'lucide-react';
import clsx from 'clsx';
import type { ChatMessage as ChatMessageType, SourceReference } from '../../types';

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

function getBestSource(sources: SourceReference[]): SourceReference | null {
  if (!sources || sources.length === 0) return null;
  return sources.reduce((best, curr) => (curr.score > best.score ? curr : best), sources[0]);
}

export default function ChatMessage({ message, isStreaming }: Props) {
  const isUser = message.role === 'USER';
  const references = message.references;
  const bestSource = !isUser && references?.sources ? getBestSource(references.sources) : null;

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
              <span className="inline-block h-4 w-1 animate-pulse-subtle bg-bc-primary rounded-full" />
            )}

            {bestSource && (
              <div className="mt-3 pt-3 border-t border-bc-border">
                <a
                  href={`/api/documents/download/${bestSource.document_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-bc-primary/8 border border-bc-primary/20 px-3 py-2 text-xs font-medium text-bc-primary hover:bg-bc-primary/15 transition-colors"
                >
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{bestSource.document_name}</span>
                  <Download size={12} className="shrink-0 ml-1" />
                </a>
              </div>
            )}

            {!isUser && references?.api_results && references.api_results.length > 0 && (
              <div className="mt-2 pt-2 border-t border-bc-border">
                <div className="space-y-1.5">
                  {references.api_results.map((api, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg bg-bc-bg-dark/50 px-3 py-2 text-xs"
                    >
                      <ExternalLink size={12} className="text-bc-secondary shrink-0" />
                      <span className="truncate text-bc-text-secondary">{api.api_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
