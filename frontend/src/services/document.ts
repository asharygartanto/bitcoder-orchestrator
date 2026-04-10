import api from './api';
import type { Document, ProcessingStatus } from '../types';

export async function uploadDocument(
  contextId: string,
  file: File,
  name?: string,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const { data } = await api.post<Document>(`/api/documents/upload/${contextId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getDocumentStatus(documentId: string): Promise<ProcessingStatus> {
  const { data } = await api.get<ProcessingStatus>(`/api/documents/status/${documentId}`);
  return data;
}

export async function getDocumentsByContext(contextId: string): Promise<Document[]> {
  const { data } = await api.get<Document[]>(`/api/documents/context/${contextId}`);
  return data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/api/documents/${documentId}`);
}

export async function replaceDocument(
  documentId: string,
  file: File,
  name?: string,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const { data } = await api.post<Document>(`/api/documents/replace/${documentId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function reindexContext(contextId: string): Promise<void> {
  await api.post(`/api/rag/reindex/${contextId}`);
}
