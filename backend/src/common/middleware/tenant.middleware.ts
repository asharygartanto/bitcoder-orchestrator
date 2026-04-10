import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const orgId = req.headers['x-organization-id'] as string;
    if (orgId) {
      req.organizationId = orgId;
    }
    next();
  }
}
