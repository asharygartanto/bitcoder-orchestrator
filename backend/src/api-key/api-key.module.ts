import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './api-key.guard';
import { PublicApiController } from './public-api.controller';
import { RagModule } from '../rag/rag.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { ApiConfigModule } from '../api-config/api-config.module';
import { DepartmentModule } from '../department/department.module';

@Module({
  imports: [RagModule, AuthModule, ChatModule, ApiConfigModule, DepartmentModule],
  controllers: [ApiKeyController, PublicApiController],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
