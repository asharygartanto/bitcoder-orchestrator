import { Module } from '@nestjs/common';
import { AgentGateway } from './agent-gateway.gateway';
import { AgentGatewayService } from './agent-gateway.service';
import { AgentInstallController } from './agent-install.controller';
import { ClientModule } from '../client/client.module';
import { LicenseModule } from '../license/license.module';

@Module({
  imports: [ClientModule, LicenseModule],
  controllers: [AgentInstallController],
  providers: [AgentGateway, AgentGatewayService],
  exports: [AgentGatewayService],
})
export class AgentGatewayModule {}
