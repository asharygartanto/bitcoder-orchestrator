import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    const { emails, displayName, photos, id } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('No email from Google'), null);
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      const defaultOrg = await this.prisma.organization.findFirst({
        where: { slug: 'bitcoder-default' },
      });

      if (!defaultOrg) {
        return done(new Error('No default organization found'), null);
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name: displayName,
          avatar: photos?.[0]?.value,
          googleId: id,
          role: 'USER',
          organizationId: defaultOrg.id,
        },
        include: { organization: true },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: id, avatar: photos?.[0]?.value || user.avatar },
        include: { organization: true },
      });
    }

    done(null, user);
  }
}
