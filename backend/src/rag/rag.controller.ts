import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('rag')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RagController {
  constructor(private ragService: RagService) {}

  @Post('query')
  async query(@Req() req: Request, @Body() body: {
    query: string;
    contextId: string;
    topK?: number;
  }) {
    return this.ragService.query(
      body.query,
      body.contextId,
      req.user['organizationId'],
      body.topK,
    );
  }

  @Sse('query/stream')
  async queryStream(@Req() req: Request) {
    const { query, contextId, topK } = req.query;
    const generator = this.ragService.queryStream(
      query as string,
      contextId as string,
      req.user['organizationId'],
      Number(topK) || 5,
    );

    return new Observable<string>((subscriber) => {
      (async () => {
        try {
          for await (const chunk of generator) {
            subscriber.next(chunk);
          }
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  @Get('stats/:contextId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStats(@Req() req: Request, @Param('contextId') contextId: string) {
    return this.ragService.getStats(req.user['organizationId'], contextId);
  }

  @Post('reindex/:contextId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async reindex(@Req() req: Request, @Param('contextId') contextId: string) {
    return this.ragService.reindex(req.user['organizationId'], contextId);
  }
}
