import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '7d' as any },
    }),
  ],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
