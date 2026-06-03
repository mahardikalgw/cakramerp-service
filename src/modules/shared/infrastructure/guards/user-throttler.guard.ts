import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * User-aware throttler.
 *
 * Inherits the default IP-based keying for anonymous traffic but, when a
 * request has been authenticated by the JWT guard (i.e. `req.user` is
 * populated), uses the user id as the throttle key. This stops a single
 * authenticated user from bypassing limits by rotating IPs while still
 * rate-limiting unauthenticated traffic normally.
 *
 * Falls back to the IP address if no user is attached to the request.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req?.user;
    if (user && (user.sub || user.id)) {
      return `user:${user.sub ?? user.id}`;
    }
    return `ip:${req?.ip ?? 'unknown'}`;
  }
}
