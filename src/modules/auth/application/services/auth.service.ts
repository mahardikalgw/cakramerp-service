import {
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { User } from '../../../user/domain/entities/user.entity';
import type { UserRepositoryPort } from '../../../user/domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../../user/domain/repositories/user-repository.port';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import type { AuthRepositoryPort } from '../../domain/repositories/auth-repository.port';
import { AUTH_REPOSITORY } from '../../domain/repositories/auth-repository.port';
import { LoginCommand } from '../commands/login.command';
import { RegisterCommand } from '../commands/register.command';
import { AuthTokensResult } from '../results/auth-tokens.result';
import { AuthServicePort } from '../ports/auth-service.port';
import { envConfig } from '../../../../config/env.config';

@Injectable()
export class AuthService implements AuthServicePort {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
    private readonly jwtService: JwtService,
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
    return this.generateTokens(saved.id, saved.email, undefined);
  }

  async login(command: LoginCommand): Promise<AuthTokensResult> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcryptjs.compare(command.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user with roles and permissions
    const userWithRoles = await this.userRepository.findById(user.id);

    return this.generateTokens(user.id, user.email, userWithRoles ?? undefined);
  }

  async refresh(refreshToken: string): Promise<AuthTokensResult> {
    const tokenHash = await this.hashToken(refreshToken);
    const stored = await this.authRepository.findByTokenHash(tokenHash);

    if (!stored || stored.isExpired()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.authRepository.delete(stored.id);
    return this.generateTokens(user.id, user.email, user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = await this.hashToken(refreshToken);
    const stored = await this.authRepository.findByTokenHash(tokenHash);
    if (stored) {
      await this.authRepository.delete(stored.id);
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    user?: User,
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
    });
    await this.authRepository.save(refresh);

    return new AuthTokensResult(accessToken, refreshToken, 900, user);
  }

  private async hashToken(token: string): Promise<string> {
    return bcryptjs.hash(token, 10);
  }
}
