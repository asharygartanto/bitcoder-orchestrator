import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentGateway } from '../agent-gateway/agent-gateway.gateway';
import { AgentGatewayService } from '../agent-gateway/agent-gateway.service';

@Injectable()
export class RagService {
  constructor(
    private httpService: HttpService,
    private apiConfigService: ApiConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => AgentGateway))
    private agentGateway: AgentGateway,
    @Inject(forwardRef(() => AgentGatewayService))
    private agentGatewayService: AgentGatewayService,
  ) {}

  private async getClientForOrg(organizationId: string) {
    return this.prisma.client.findFirst({
      where: { organizationId },
    });
  }

  private async routeThroughAgent(
    clientId: string,
    action: string,
    payload: any,
    timeoutMs: number = 60000,
  ): Promise<any> {
    const socket = this.agentGateway.getSocket(clientId);
    if (!socket) {
      throw new Error('Agent not connected');
    }

    return this.agentGatewayService.createTask(
      clientId,
      (taskId: string) => {
        return socket.emit('task', { id: taskId, action, payload });
      },
      timeoutMs,
    );
  }

  async query(
    query: string,
    contextId: string,
    organizationId: string,
    topK: number = 5,
  ) {
    const apiConfigs = await this.apiConfigService.getActiveConfigs(contextId);

    const client = await this.getClientForOrg(organizationId);
    if (client && client.status === 'ONLINE') {
      return this.routeThroughAgent(client.id, 'query', {
        query,
        context_id: contextId,
        organization_id: organizationId,
        top_k: topK,
        api_configs: apiConfigs,
      });
    }

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

    const client = await this.getClientForOrg(organizationId);
    if (client && client.status === 'ONLINE') {
      const result = await this.routeThroughAgent(client.id, 'query_stream', {
        query,
        context_id: contextId,
        organization_id: organizationId,
        top_k: topK,
        api_configs: apiConfigs,
      }, 120000);

      if (typeof result === 'string') {
        yield result;
      } else if (result?.chunks) {
        for (const chunk of result.chunks) {
          yield chunk;
        }
      }
      return;
    }

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
    const client = await this.getClientForOrg(organizationId);
    if (client && client.status === 'ONLINE') {
      return this.routeThroughAgent(client.id, 'get_stats', {
        organization_id: organizationId,
        context_id: contextId,
      });
    }

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${ragUrl}/api/documents/stats/${organizationId}/${contextId}`,
      ),
    );
    return data;
  }

  async reindex(organizationId: string, contextId: string) {
    const client = await this.getClientForOrg(organizationId);
    if (client && client.status === 'ONLINE') {
      return this.routeThroughAgent(client.id, 'reindex', {
        organization_id: organizationId,
        context_id: contextId,
      }, 120000);
    }

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
