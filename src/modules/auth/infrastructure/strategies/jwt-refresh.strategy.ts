import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtRefreshPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET ?? 'default-refresh-secret',
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: JwtRefreshPayload): Promise<JwtRefreshPayload> {
    return { sub: payload.sub, email: payload.email };
  }
}
