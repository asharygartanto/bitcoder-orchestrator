import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { ApiConfigModule } from '../api-config/api-config.module';
import { AgentGatewayModule } from '../agent-gateway/agent-gateway.module';

@Module({
  imports: [HttpModule, ApiConfigModule, forwardRef(() => AgentGatewayModule)],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
