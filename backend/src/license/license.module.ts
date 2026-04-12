import { Module } from '@nestjs/common';
import { LicenseController, LicenseValidateController } from './license.controller';
import { LicenseService } from './license.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [LicenseController, LicenseValidateController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
