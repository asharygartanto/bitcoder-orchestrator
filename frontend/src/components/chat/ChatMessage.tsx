import ReactMarkdown from 'react-markdown';
import { Bot, FileText, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { ChatMessage as ChatMessageType } from '../../types';

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: Props) {
  const isUser = message.role === 'USER';
  const references = message.references;

  return (
    <div className={clsx('animate-slide-up', isUser ? 'flex justify-end' : '')}>
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-accent/15 text-text-primary rounded-br-md'
            : 'bg-surface-2 text-text-primary rounded-bl-md border border-[hsl(var(--border))] top-light',
        )}
      >
        <div className="flex items-start gap-3">
          {!isUser && (
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Bot size={14} className="text-accent" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            {isStreaming && (
              <span className="inline-block h-4 w-1 animate-pulse-subtle bg-accent rounded-full" />
            )}

            {!isUser && references?.sources && references.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                <p className="text-xs font-medium text-text-tertiary mb-2">References</p>
                <div className="space-y-1.5">
                  {references.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg bg-surface-3/50 px-3 py-2 text-xs"
                    >
                      <FileText size={12} className="text-accent shrink-0" />
                      <span className="truncate text-text-secondary">
                        {source.document_name}
                      </span>
                      <span className="ml-auto shrink-0 text-text-muted">
                        {Math.round(source.score * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isUser && references?.api_results && references.api_results.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[hsl(var(--border))]">
                <p className="text-xs font-medium text-text-tertiary mb-1.5">API Data</p>
                <div className="space-y-1.5">
                  {references.api_results.map((api, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg bg-surface-3/50 px-3 py-2 text-xs"
                    >
                      <ExternalLink size={12} className="text-secondary shrink-0" />
                      <span className="truncate text-text-secondary">{api.api_name}</span>
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
