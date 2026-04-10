import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ContextModule } from './context/context.module';
import { DocumentModule } from './document/document.module';
import { ApiConfigModule } from './api-config/api-config.module';
import { RagModule } from './rag/rag.module';
import { OrganizationModule } from './organization/organization.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ChatModule,
    ContextModule,
    DocumentModule,
    ApiConfigModule,
    RagModule,
    OrganizationModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/auth/login', method: RequestMethod.POST },
        { path: 'api/auth/register', method: RequestMethod.POST },
        { path: 'api/auth/google', method: RequestMethod.GET },
        { path: 'api/auth/google/callback', method: RequestMethod.GET },
        { path: 'api/docs', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
