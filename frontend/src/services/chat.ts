import api from './api';
import type { ChatSession, ChatMessage, SourceReference } from '../types';

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

export async function sendMessageStream(
  sessionId: string,
  content: string,
  onChunk: (text: string) => void,
  onMetadata: (sources: SourceReference[], contextUsed: number) => void,
  onDone: () => void,
): Promise<void> {
  const token = localStorage.getItem('bitcoder_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  const response = await fetch(`${baseUrl}/api/chat/sessions/${sessionId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.body) {
    onDone();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'metadata') {
            onMetadata(parsed.sources || [], parsed.context_used || 0);
          } else if (parsed.type === 'error') {
            onChunk(parsed.message || 'Error');
          }
        } catch {
          onChunk(data);
        }
      }
    }
  }
  onDone();
}
