import { AuthTokensResult } from '../../../application/results/auth-tokens.result';

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;

  static fromResult(result: AuthTokensResult): TokenResponseDto {
    const dto = new TokenResponseDto();
    dto.accessToken = result.accessToken;
    dto.refreshToken = result.refreshToken;
    dto.expiresIn = result.expiresIn;
    return dto;
  }
}
