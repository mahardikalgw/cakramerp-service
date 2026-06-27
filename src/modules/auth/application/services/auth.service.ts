import {
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { User } from '../../../user/domain/entities/user.entity';
import type { UserRepositoryPort } from '../../../user/domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../../user/domain/repositories/user-repository.port';
import type { UserRoleAssignerPort } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import type { RoleRepositoryPort } from '../../../iam/domain/repositories/role-repository.port';
import { ROLE_REPOSITORY } from '../../../iam/domain/repositories/role-repository.port';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import type { AuthRepositoryPort } from '../../domain/repositories/auth-repository.port';
import { AUTH_REPOSITORY } from '../../domain/repositories/auth-repository.port';
import { LoginCommand } from '../commands/login.command';
import { RegisterCommand } from '../commands/register.command';
import { AuthTokensResult } from '../results/auth-tokens.result';
import { AuthServicePort } from '../ports/auth-service.port';
import { envConfig } from '../../../../config/env.config';
import { AUDIT_LOG_QUEUE_NAME } from '../../../../queues/audit-log.constants';

@Injectable()
export class AuthService implements AuthServicePort {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
    @Inject(USER_ROLE_ASSIGNER_PORT)
    private readonly roleAssigner: UserRoleAssignerPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
    private readonly jwtService: JwtService,
    @InjectQueue(AUDIT_LOG_QUEUE_NAME)
    private readonly auditLogQueue: Queue,
  ) {}

  async register(command: RegisterCommand): Promise<AuthTokensResult> {
    const exists = await this.userRepository.existsByEmail(command.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcryptjs.hash(command.password, 12);
    const user = new User({
      email: command.email,
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
    });

    const saved = await this.userRepository.save(user);
    await this.assignDefaultRole(saved.id);
    const userWithRoles = await this.userRepository.findById(saved.id);
    return this.generateTokens(
      saved.id,
      saved.email,
      userWithRoles ?? undefined,
    );
  }

  async login(command: LoginCommand): Promise<AuthTokensResult> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      await this.enqueueAuditLog({
        userId: 'unknown',
        userName: command.email,
        action: 'login_failed',
        module: 'auth',
        recordId: '',
        ipAddress: command.ipAddress,
        payload: { reason: 'user_not_found', email: command.email },
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcryptjs.compare(command.password, user.passwordHash);
    if (!valid) {
      await this.enqueueAuditLog({
        userId: user.id,
        userName: user.email,
        action: 'login_failed',
        module: 'auth',
        recordId: user.id,
        ipAddress: command.ipAddress,
        payload: { reason: 'invalid_password' },
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user with roles and permissions
    const userWithRoles = await this.userRepository.findById(user.id);

    return this.generateTokens(
      user.id,
      user.email,
      userWithRoles ?? undefined,
      {
        ipAddress: command.ipAddress,
      },
    );
  }

  async refresh(
    refreshToken: string,
    sessionInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokensResult> {
    const stored = await this.authRepository.findByTokenHash(refreshToken);

    if (!stored || stored.isExpired()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Session binding check: reject if IP or user agent changed
    if (
      !stored.isSessionValid(sessionInfo?.ipAddress, sessionInfo?.userAgent)
    ) {
      await this.authRepository.delete(stored.id);
      await this.enqueueAuditLog({
        userId: stored.userId,
        userName: 'unknown',
        action: 'login_failed',
        module: 'auth',
        recordId: stored.userId,
        ipAddress: sessionInfo?.ipAddress,
        payload: { reason: 'session_binding_mismatch' },
      }).catch(() => {});
      throw new UnauthorizedException('Session expired — IP or device changed');
    }

    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.authRepository.delete(stored.id);
    return this.generateTokens(user.id, user.email, user, sessionInfo);
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.authRepository.findByTokenHash(refreshToken);
    if (stored) {
      await this.authRepository.delete(stored.id);
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    user?: User,
    sessionInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokensResult> {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret: envConfig.jwt.secret,
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: envConfig.jwt.refreshSecret,
      expiresIn: '7d',
    });

    const tokenHash = await this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refresh = new RefreshToken({
      userId,
      tokenHash,
      expiresAt,
      ipAddress: sessionInfo?.ipAddress,
      userAgent: sessionInfo?.userAgent,
    });
    await this.authRepository.save(refresh);

    return new AuthTokensResult(accessToken, refreshToken, 900, user);
  }

  private async assignDefaultRole(userId: string): Promise<void> {
    try {
      const role = await this.roleRepository.findByName('customer');
      if (role) {
        await this.roleAssigner.assignRoles(userId, [role.id]);
      }
    } catch {
      // Role assignment is non-blocking; role can be assigned manually later
    }
  }

  private async hashToken(token: string): Promise<string> {
    return bcryptjs.hash(token, 10);
  }

  private async enqueueAuditLog(data: {
    userId: string;
    userName: string;
    action: string;
    module: string;
    recordId: string;
    ipAddress?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.auditLogQueue.add('audit-log', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
