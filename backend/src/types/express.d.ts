import 'express';
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      organizationId: string;
      organization: {
        id: string;
        name: string;
        slug: string;
      } | null;
    }

    interface Request {
      user?: User;
      organizationId?: string;
    }
  }
}
