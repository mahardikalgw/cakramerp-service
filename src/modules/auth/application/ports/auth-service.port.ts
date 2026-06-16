import { LoginCommand } from '../commands/login.command';
import { RegisterCommand } from '../commands/register.command';
import { AuthTokensResult } from '../results/auth-tokens.result';

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

export interface AuthServicePort {
  register(command: RegisterCommand): Promise<AuthTokensResult>;
  login(command: LoginCommand): Promise<AuthTokensResult>;
  refresh(refreshToken: string, sessionInfo?: { ipAddress?: string; userAgent?: string }): Promise<AuthTokensResult>;
  logout(refreshToken: string): Promise<void>;
}
