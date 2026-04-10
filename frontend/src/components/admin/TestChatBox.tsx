import { useState, useRef, useEffect } from 'react';
import { sendMessage, createSession } from '../../services/chat';
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
      <div className="mb-4 rounded-xl border border-bc-primary/10 bg-bc-primary/10 p-4">
        <h3 className="text-sm font-semibold text-bc-primary">Test Chat</h3>
        <p className="mt-1 text-xs text-bc-text-muted">
          Ask questions to test if the indexed documents and API configurations produce correct answers.
          This chat uses the current context's knowledge base.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-bc-border bg-bc-bg-muted p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Bot size={32} className="mx-auto mb-2 text-bc-text-muted" />
              <p className="text-sm text-bc-text-muted">
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
                      ? 'bg-bc-primary/10 text-bc-text-dark rounded-br-md'
                      : 'bg-bc-bg-dark text-bc-text-dark rounded-bl-md border border-bc-border'
                  }`}
                >
                  <div className="prose prose-sm max-w-none text-sm text-bc-text-dark">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {msg.references?.sources && msg.references.sources.length > 0 && (() => {
                    const best = msg.references.sources.reduce((a, b) => a.score > b.score ? a : b);
                    return (
                      <div className="mt-3 pt-3 border-t border-bc-border">
                        <a
                          href={`/api/documents/download/${best.document_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-bc-primary/8 border border-bc-primary/20 px-3 py-2 text-xs font-medium text-bc-primary hover:bg-bc-primary/15 transition-colors"
                        >
                          <FileText size={14} className="shrink-0" />
                          <span className="truncate">{best.document_name}</span>
                        </a>
                      </div>
                    );
                  })()}

                  {msg.references?.api_results && msg.references.api_results.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-bc-border space-y-1">
                      <p className="text-xs font-medium text-bc-text-muted">API Data</p>
                      {msg.references.api_results.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-bc-bg-muted px-2 py-1.5 text-xs">
                          <ExternalLink size={10} className="text-bc-secondary shrink-0" />
                          <span className="truncate text-bc-text-secondary">{a.api_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bc-primary/10">
                  <span className="text-bc-primary text-xs">AI</span>
                </div>
                <div className="rounded-2xl rounded-bl-md bg-bc-bg-dark border border-bc-border px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-bc-text-muted animate-pulse-subtle" />
                    <span className="h-2 w-2 rounded-full bg-bc-text-muted animate-pulse-subtle" style={{ animationDelay: '200ms' }} />
                    <span className="h-2 w-2 rounded-full bg-bc-text-muted animate-pulse-subtle" style={{ animationDelay: '400ms' }} />
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
          className="flex-1 rounded-lg border border-bc-border bg-bc-bg-muted px-3 py-2.5 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-bc-primary text-white transition-all hover:bg-bc-primary-dark disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
