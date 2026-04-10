import api from './api';
import type { ChatSession, ChatMessage } from '../types';

export async function createSession(title?: string, contextId?: string): Promise<ChatSession> {
  const { data } = await api.post<ChatSession>('/api/chat/sessions', { title, contextId });
  return data;
}

export async function getSessions(): Promise<ChatSession[]> {
  const { data } = await api.get<ChatSession[]>('/api/chat/sessions');
  return data;
}

export async function getSession(sessionId: string): Promise<ChatSession> {
  const { data } = await api.get<ChatSession>(`/api/chat/sessions/${sessionId}`);
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/api/chat/sessions/${sessionId}`);
}

export async function sendMessage(
  sessionId: string,
  content: string,
  contextId?: string,
): Promise<{ message: ChatMessage; sources: any[]; api_results: any[] }> {
  const { data } = await api.post(`/api/chat/sessions/${sessionId}/messages`, {
    content,
    contextId,
  });
  return data;
}
