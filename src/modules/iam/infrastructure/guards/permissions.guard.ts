import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { UserIdentityPort } from '../../../../shared/kernel/domain/ports/user-identity.port';
import { USER_IDENTITY_PORT } from '../../../../shared/kernel/domain/ports/user-identity.port';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_IDENTITY_PORT)
    private readonly userIdentity: UserIdentityPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      return false;
    }

    const identity = await this.userIdentity.getIdentity(userId);
    if (!identity) {
      return false;
    }

    return requiredPermissions.every((p) => identity.permissions.includes(p));
  }
}
