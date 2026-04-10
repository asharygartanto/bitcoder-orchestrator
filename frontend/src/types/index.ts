export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface Context {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    apiConfigs: number;
  };
  documents?: Document[];
  apiConfigs?: ApiConfig[];
}

export interface Document {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  status: 'UPLOADED' | 'PROCESSING' | 'VECTORIZING' | 'INDEXING' | 'READY' | 'ERROR';
  vectorCount: number;
  contextId: string;
  organizationId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConfig {
  id: string;
  name: string;
  description: string | null;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string> | null;
  bodyTemplate: Record<string, unknown> | null;
  isActive: boolean;
  contextId: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  organizationId: string;
  contextId: string | null;
  createdAt: string;
  updatedAt: string;
  context?: { id: string; name: string } | null;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  references: {
    sources: SourceReference[];
    api_results: ApiResult[] | null;
  } | null;
  createdAt: string;
}

export interface SourceReference {
  document_id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  score: number;
  source_type: string;
}

export interface ApiResult {
  api_name: string;
  api_endpoint: string;
  data: Record<string, unknown>;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ProcessingStatus {
  document_id: string;
  status: string;
  phase: string;
  progress: number;
  chunks_count: number;
  message: string;
}
