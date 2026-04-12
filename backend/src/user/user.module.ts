import { Module } from '@nestjs/common';
import { UserController, AuthUserController } from './user.controller';
import { UserService } from './user.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [UserController, AuthUserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
