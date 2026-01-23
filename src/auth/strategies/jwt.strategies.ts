import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Role } from 'src/common/enum/role.enum';
import { AuthenticatedUser } from 'src/common/interface/authenticated-user.interface';

interface JwtPayload {
  sub: string;
  role: Role;
  orgId: string | null;
  email: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('jwt.access.secret');
    if (!secret) {
      throw new Error('JWT access secret is not configured');
    }
    const jwtFromRequest = (req: Request): string | null => {
      const authHeader = req.headers?.authorization;
      if (!authHeader) {
        return null;
      }
      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return null;
      }
      return token;
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      role: payload.role,
      orgId: payload.orgId,
      email: payload.email,
      name: payload.name,
    };
  }
}
