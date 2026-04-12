import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiConfigService } from '../api-config/api-config.service';

@Injectable()
export class RagService {
  constructor(
    private httpService: HttpService,
    private apiConfigService: ApiConfigService,
  ) {}

  async query(
    query: string,
    contextId: string,
    organizationId: string,
    topK: number = 5,
  ) {
    const apiConfigs = await this.apiConfigService.getActiveConfigs(contextId);
    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';

    const { data } = await firstValueFrom(
      this.httpService.post(`${ragUrl}/api/query`, {
        query,
        context_id: contextId,
        organization_id: organizationId,
        top_k: topK,
        api_configs: apiConfigs,
      }),
    );

    return data;
  }

  async *queryStream(
    query: string,
    contextId: string,
    organizationId: string,
    topK: number = 5,
  ): AsyncGenerator<string> {
    const apiConfigs = await this.apiConfigService.getActiveConfigs(contextId);
    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';

    const response = await fetch(`${ragUrl}/api/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        context_id: contextId,
        organization_id: organizationId,
        top_k: topK,
        api_configs: apiConfigs,
      }),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }

  async getStats(organizationId: string, contextId: string) {
    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${ragUrl}/api/documents/stats/${organizationId}/${contextId}`,
      ),
    );
    return data;
  }

  async reindex(organizationId: string, contextId: string) {
    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    const { data } = await firstValueFrom(
      this.httpService.post(`${ragUrl}/api/documents/reindex`, {
        context_id: contextId,
        organization_id: organizationId,
      }),
    );
    return data;
  }
}
