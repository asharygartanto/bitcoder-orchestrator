import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../stores/chat.store';
import {
  getSessions,
  createSession,
  deleteSession,
  getSession,
  sendMessageStream,
} from '../services/chat';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import ChatInput from '../components/chat/ChatInput';
import type { ChatMessage, SourceReference } from '../types';
import { MessageSquarePlus } from 'lucide-react';

export default function ChatPage() {
  const {
    sessions,
    activeSession,
    messages,
    isLoading,
    isSending,
    setSessions,
    setActiveSession,
    addMessage,
    setLoading,
    setSending,
    removeSession,
  } = useChatStore();

  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<SourceReference[]>([]);
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);
  const activeStreamIdRef = useRef<string | null>(null);

  const isCurrentSending = isSending && streamingSessionId === activeSession?.id;

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {}
  };

  const handleNewChat = async () => {
    try {
      const session = await createSession('New Chat');
      setSessions([session, ...sessions]);
      setActiveSession(session);
    } catch {}
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const session = await getSession(sessionId);
      setActiveSession(session);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      removeSession(sessionId);
    } catch {}
  };

  const handleSend = async (content: string) => {
    if (!activeSession) {
      try {
        const session = await createSession(content.substring(0, 50));
        setSessions([session, ...sessions]);
        setActiveSession({ ...session, messages: [] });
        await doStream(session.id, content);
      } catch {}
    } else {
      await doStream(activeSession.id, content);
    }
  };

  const doStream = async (sessionId: string, content: string) => {
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId,
      role: 'USER',
      content,
      references: null,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);
    setSending(true);
    setStreamingSessionId(sessionId);
    activeStreamIdRef.current = sessionId;
    setStreamingContent('');
    setStreamingSources([]);

    let fullContent = '';
    let sources: SourceReference[] = [];

    try {
      await sendMessageStream(
        sessionId,
        content,
        (chunk) => {
          if (activeStreamIdRef.current !== sessionId) return;
          fullContent += chunk;
          setStreamingContent(fullContent);
        },
        (meta) => {
          if (activeStreamIdRef.current !== sessionId) return;
          sources = meta;
          setStreamingSources(meta);
        },
        () => {},
      );
    } catch {
      fullContent = fullContent || 'Sorry, an error occurred. Please try again.';
    }

    if (activeStreamIdRef.current === sessionId) {
      const assistantMsg: ChatMessage = {
        id: `stream-${Date.now()}`,
        sessionId,
        role: 'ASSISTANT',
        content: fullContent,
        references: sources.length > 0 ? { sources, api_results: null } : null,
        createdAt: new Date().toISOString(),
      };
      addMessage(assistantMsg);
      setSending(false);
      setStreamingSessionId(null);
      activeStreamIdRef.current = null;
      setStreamingContent('');
      setStreamingSources([]);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-bc-border bg-bc-bg-subtle flex flex-col">
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-bc-border bg-white px-3 py-2.5 text-sm font-medium text-bc-text-secondary transition-all hover:bg-bc-bg-muted hover:text-bc-text-dark shadow-sm"
          >
            <MessageSquarePlus size={18} />
            New Chat
          </button>
        </div>

        <ChatSidebar
          sessions={sessions}
          activeId={activeSession?.id}
          onSelect={handleSelectSession}
          onDelete={handleDeleteSession}
        />
      </div>

      <div className="flex flex-1 flex-col">
        <ChatWindow
          messages={messages}
          isSending={isCurrentSending}
          streamingContent={streamingContent}
          streamingSources={streamingSources}
        />
        <ChatInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}
