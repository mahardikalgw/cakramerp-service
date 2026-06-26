import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CustomerRepositoryPort } from '../../domain/repositories/customer-repository.port';
import { CUSTOMER_REPOSITORY } from '../../domain/repositories/customer-repository.port';
import type { UserRepositoryPort } from '../../../user/domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../../user/domain/repositories/user-repository.port';

/**
 * Resolves the authenticated user to a Customer record and attaches
 * `req.customerId` for downstream portal handlers. Fails closed (404) when the
 * caller has no linked Customer profile, which prevents non-customer roles
 * (admin/laboran) from accessing portal endpoints while also blocking any
 * cross-tenant access at the resolution layer.
 *
 * Portal handlers are still expected to perform explicit per-entity ownership
 * assertions (e.g. assertOwnsResult) — this guard only guarantees that
 * `req.customerId` is populated and trustworthy.
 */
@Injectable()
export class CustomerPortalGuard implements CanActivate {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    let customer = await this.customerRepo.findByUserId?.(userId);
    if (!customer) {
      const user = await this.userRepo.findById(userId);
      if (user?.email) {
        customer = await this.customerRepo.findByEmail?.(user.email);
        if (customer) {
          // Backfill the link so subsequent lookups are direct.
          customer.userId = userId;
          customer.portalAccess = true;
          await this.customerRepo.save(customer);
        }
      }
    }

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    req.customerId = customer.id as string;
    return true;
  }
}
