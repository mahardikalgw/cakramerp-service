import { AuthTokensResult } from '../../../application/results/auth-tokens.result';

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles?: string[];
    permissions?: string[];
  };

  static fromResult(result: AuthTokensResult): TokenResponseDto {
    const dto = new TokenResponseDto();
    dto.accessToken = result.accessToken;
    dto.refreshToken = result.refreshToken;
    dto.expiresIn = result.expiresIn;
    if (result.user) {
      dto.user = {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        roles: result.user.roles,
        permissions: result.user.permissions,
      };
    }
    return dto;
  }
}
