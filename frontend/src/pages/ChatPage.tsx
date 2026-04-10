import React, { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chat.store';
import {
  getSessions,
  createSession,
  deleteSession,
  sendMessage,
  getSession,
} from '../services/chat';
import { getContexts } from '../services/context';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import ChatInput from '../components/chat/ChatInput';
import ContextSelector from '../components/chat/ContextSelector';
import type { ChatMessage, SourceReference } from '../types';
import { MessageSquarePlus } from 'lucide-react';

export default function ChatPage() {
  const {
    sessions,
    activeSession,
    messages,
    contexts,
    selectedContext,
    isLoading,
    isSending,
    setSessions,
    setActiveSession,
    addMessage,
    setContexts,
    setSelectedContext,
    setLoading,
    setSending,
    removeSession,
  } = useChatStore();

  const streamingContent = '';
  const streamingSources: SourceReference[] = [];

  useEffect(() => {
    loadSessions();
    loadContexts();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {}
  };

  const loadContexts = async () => {
    try {
      const data = await getContexts();
      setContexts(data);
    } catch {}
  };

  const handleNewChat = async () => {
    try {
      const session = await createSession('New Chat', selectedContext?.id);
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
        const session = await createSession(content.substring(0, 50), selectedContext?.id);
        setSessions([session, ...sessions]);
        setActiveSession({ ...session, messages: [] });
        await doSend(session.id, content);
      } catch {}
    } else {
      await doSend(activeSession.id, content);
    }
  };

  const doSend = async (sessionId: string, content: string) => {
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

    try {
      const result = await sendMessage(sessionId, content, selectedContext?.id);
      addMessage(result.message);
    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sessionId,
        role: 'ASSISTANT',
        content: 'Sorry, an error occurred. Please try again.',
        references: null,
        createdAt: new Date().toISOString(),
      };
      addMessage(errMsg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-[hsl(var(--border))] bg-surface-1 flex flex-col">
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-surface-2 px-3 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-surface-3 hover:text-text-primary top-light"
          >
            <MessageSquarePlus size={18} />
            New Chat
          </button>
        </div>

        <div className="px-3 pb-2">
          <ContextSelector
            contexts={contexts}
            selected={selectedContext}
            onSelect={setSelectedContext}
          />
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
          isSending={isSending}
          streamingContent={streamingContent}
          streamingSources={streamingSources}
        />
        <ChatInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}
