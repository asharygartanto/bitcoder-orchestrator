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
import { ClientModule } from './client/client.module';
import { AgentGatewayModule } from './agent-gateway/agent-gateway.module';
import { UserModule } from './user/user.module';
import { SsoModule } from './sso/sso.module';
import { EmailModule } from './email/email.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { NewsCrawlModule } from './news-crawl/news-crawl.module';
import { LicenseModule } from './license/license.module';
import { DepartmentModule } from './department/department.module';
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
    ClientModule,
    AgentGatewayModule,
    UserModule,
    SsoModule,
    EmailModule,
    ApiKeyModule,
    NewsCrawlModule,
    LicenseModule,
    DepartmentModule,
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
        { path: 'api/auth/forgot-password', method: RequestMethod.POST },
        { path: 'api/auth/reset-password', method: RequestMethod.POST },
        { path: 'api/docs', method: RequestMethod.GET },
        { path: 'api/agent/install.sh', method: RequestMethod.GET },
        { path: 'api/sso/login/:orgSlug', method: RequestMethod.GET },
        { path: 'api/sso/callback/:orgSlug', method: RequestMethod.POST },
        { path: 'api/public/{*path}', method: RequestMethod.ALL },
        { path: 'api/license/validate', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
