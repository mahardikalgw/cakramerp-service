import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserIdentityPort } from '../../../../shared/kernel/domain/ports/user-identity.port';
import { USER_IDENTITY_PORT } from '../../../../shared/kernel/domain/ports/user-identity.port';

interface RequestWithUser {
  user?: {
    sub?: string;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_IDENTITY_PORT)
    private readonly userIdentity: UserIdentityPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.sub ?? (request.user as any)?.id;

    if (!userId) {
      return false;
    }

    const identity = await this.userIdentity.getIdentity(userId);
    if (!identity) {
      return false;
    }

    return requiredRoles.some((role) => identity.roles.includes(role));
  }
}
