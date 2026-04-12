import { Module } from '@nestjs/common';
import { ClientController, BrandingController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  controllers: [ClientController, BrandingController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
