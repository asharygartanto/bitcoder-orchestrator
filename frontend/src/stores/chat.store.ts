import { create } from 'zustand';
import type { ChatSession, ChatMessage, Context } from '../types';

interface ChatState {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  contexts: Context[];
  selectedContext: Context | null;
  isLoading: boolean;
  isSending: boolean;

  setSessions: (sessions: ChatSession[]) => void;
  setActiveSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setContexts: (contexts: Context[]) => void;
  setSelectedContext: (context: Context | null) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  removeSession: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSession: null,
  messages: [],
  contexts: [],
  selectedContext: null,
  isLoading: false,
  isSending: false,

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (session) => set({ activeSession: session, messages: session?.messages || [] }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setContexts: (contexts) => set({ contexts }),
  setSelectedContext: (context) => set({ selectedContext: context }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSending: (sending) => set({ isSending: sending }),
  removeSession: (id) => set((state) => ({
    sessions: state.sessions.filter((s) => s.id !== id),
    activeSession: state.activeSession?.id === id ? null : state.activeSession,
  })),
}));
