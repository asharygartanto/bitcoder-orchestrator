import axios from 'axios';

interface Config {
  db: any;
  ai: any;
  storage: any;
}

export class TaskHandler {
  private config: Config | null = null;
  private ragEngineUrl = process.env.RAG_ENGINE_URL || 'http://rag-engine:8000';

  updateConfig(config: Config) {
    this.config = config;
    this.writeEnvFile(config);
  }

  private writeEnvFile(config: Config) {
    const fs = require('fs');
    const lines: string[] = [];

    if (config.db) {
      lines.push(`POSTGRES_HOST=${config.db.host || 'postgres'}`);
      lines.push(`POSTGRES_PORT=${config.db.port || 5432}`);
      lines.push(`POSTGRES_DB=${config.db.name || 'bitcoder'}`);
      lines.push(`POSTGRES_USER=${config.db.user || 'bitcoder'}`);
      lines.push(`POSTGRES_PASSWORD=${config.db.password || ''}`);
      lines.push(`DATABASE_URL=postgresql://${config.db.user || 'bitcoder'}:${config.db.password || ''}@${config.db.host || 'postgres'}:${config.db.port || 5432}/${config.db.name || 'bitcoder'}?schema=public`);
    }

    if (config.ai) {
      lines.push(`AI_API_KEY=${config.ai.apiKey || ''}`);
      lines.push(`AI_API_BASE_URL=${config.ai.baseUrl || 'https://api.bitcoder.ai/v1'}`);
      lines.push(`AI_CHAT_MODEL=${config.ai.chatModel || 'bitcoder-chat'}`);
      lines.push(`AI_EMBEDDING_MODEL=${config.ai.embeddingModel || 'bitcoder-embedding'}`);
      lines.push(`AI_MAX_TOKENS=${config.ai.maxTokens || 4096}`);
      lines.push(`AI_TEMPERATURE=${config.ai.temperature || 0.7}`);
    }

    if (config.storage) {
      lines.push(`UPLOAD_DIR=${config.storage.uploadDir || './uploads'}`);
    }

    const envPath = '/app/.env.agent';
    fs.writeFileSync(envPath, lines.join('\n'));
    console.log(`Config written to ${envPath}`);
  }

  async handle(action: string, payload: any): Promise<any> {
    switch (action) {
      case 'query':
        return this.forwardQuery(payload);
      case 'query_stream':
        return this.forwardQueryStream(payload);
      case 'get_stats':
        return this.forwardGetStats(payload);
      case 'reindex':
        return this.forwardReindex(payload);
      case 'ping':
        return { pong: true, timestamp: Date.now() };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async forwardQuery(payload: any) {
    const { data } = await axios.post(`${this.ragEngineUrl}/api/query`, payload, {
      timeout: 60000,
    });
    return data;
  }

  private async forwardQueryStream(payload: any) {
    const response = await fetch(`${this.ragEngineUrl}/api/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.body) throw new Error('No response body from RAG engine');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value, { stream: true }));
    }

    return { chunks };
  }

  private async forwardGetStats(payload: any) {
    const { data } = await axios.get(
      `${this.ragEngineUrl}/api/documents/stats/${payload.organization_id}/${payload.context_id}`,
      { timeout: 30000 },
    );
    return data;
  }

  private async forwardReindex(payload: any) {
    const { data } = await axios.post(`${this.ragEngineUrl}/api/documents/reindex`, payload, {
      timeout: 120000,
    });
    return data;
  }
}
