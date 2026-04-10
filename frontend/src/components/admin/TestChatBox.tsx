import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../../services/chat';
import { createSession } from '../../services/chat';
import { Send, Loader2, Bot, FileText, ExternalLink } from 'lucide-react';
import type { ChatMessage } from '../../types';
import ReactMarkdown from 'react-markdown';

interface Props {
  contextId: string;
}

export default function TestChatBox({ contextId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || loading) return;

    let sid = sessionId;
    if (!sid) {
      try {
        const session = await createSession('Admin Test', contextId);
        sid = session.id;
        setSessionId(sid);
      } catch {
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: `test-u-${Date.now()}`,
      sessionId: sid,
      role: 'USER',
      content,
      references: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendMessage(sid, content, contextId);
      setMessages((prev) => [...prev, result.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `test-e-${Date.now()}`,
          sessionId: sid!,
          role: 'ASSISTANT',
          content: 'Error: Could not get a response. Check if RAG engine and AI API are running.',
          references: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
        <h3 className="text-sm font-semibold text-accent-light">Test Chat</h3>
        <p className="mt-1 text-xs text-text-tertiary">
          Ask questions to test if the indexed documents and API configurations produce correct answers.
          This chat uses the current context's knowledge base.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-surface-2 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Bot size={32} className="mx-auto mb-2 text-text-muted" />
              <p className="text-sm text-text-tertiary">
                Ask a question to test this context
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === 'USER' ? 'flex justify-end' : ''}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'USER'
                      ? 'bg-accent/15 text-text-primary rounded-br-md'
                      : 'bg-surface-3 text-text-primary rounded-bl-md border border-[hsl(var(--border))]'
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {msg.references?.sources && msg.references.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] space-y-1.5">
                      <p className="text-xs font-medium text-text-tertiary">Sources</p>
                      {msg.references.sources.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5 text-xs">
                          <FileText size={10} className="text-accent shrink-0" />
                          <span className="truncate text-text-secondary">{s.document_name}</span>
                          <span className="ml-auto text-text-muted">{Math.round(s.score * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.references?.api_results && msg.references.api_results.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[hsl(var(--border))] space-y-1">
                      <p className="text-xs font-medium text-text-tertiary">API Data</p>
                      {msg.references.api_results.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5 text-xs">
                          <ExternalLink size={10} className="text-secondary shrink-0" />
                          <span className="truncate text-text-secondary">{a.api_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20">
                  <span className="text-accent text-xs">AI</span>
                </div>
                <div className="rounded-2xl rounded-bl-md bg-surface-3 border border-[hsl(var(--border))] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-text-tertiary animate-pulse-subtle" />
                    <span className="h-2 w-2 rounded-full bg-text-tertiary animate-pulse-subtle" style={{ animationDelay: '200ms' }} />
                    <span className="h-2 w-2 rounded-full bg-text-tertiary animate-pulse-subtle" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a test question..."
          className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-surface-2 px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent/50"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
