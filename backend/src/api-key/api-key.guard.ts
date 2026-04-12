import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../api-key/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.headers['x-api-key'] as string
      || request.query?.api_key as string
      || (request.headers['authorization']?.startsWith('ApiKey ')
        ? request.headers['authorization'].replace('ApiKey ', '')
        : null);

    if (!apiKey) {
      throw new UnauthorizedException('API key required. Use header: x-api-key or Authorization: ApiKey <key>');
    }

    const result = await this.apiKeyService.validateKey(apiKey);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    (request as any).apiKey = {
      organizationId: result.organizationId,
      apiKeyId: result.apiKeyId,
    };

    return true;
  }
}
