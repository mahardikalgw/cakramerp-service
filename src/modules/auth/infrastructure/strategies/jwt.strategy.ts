import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import type { Cache } from 'cache-manager';
import { envConfig } from '../../../../config/env.config';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

const AUTH_CACHE_TTL = 60_000; // 60 seconds

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig.jwt.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const cacheKey = `auth:user:${payload.sub}`;
    const cached = await this.cache.get<AuthenticatedUser>(cacheKey);
    if (cached) return cached;

    const [roles, permissions] = await Promise.all([
      this.dataSource.query(
        `SELECT r.name FROM roles r
         INNER JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = $1`,
        [payload.sub],
      ),
      this.dataSource.query(
        `SELECT DISTINCT p.name FROM permissions p
         INNER JOIN role_permissions rp ON rp.permission_id = p.id
         INNER JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = $1`,
        [payload.sub],
      ),
    ]);

    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      roles: roles.map((r: any) => r.name),
      permissions: permissions.map((p: any) => p.name),
    };

    await this.cache.set(cacheKey, user, AUTH_CACHE_TTL);
    return user;
  }
}
