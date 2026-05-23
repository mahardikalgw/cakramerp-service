import { User } from '../../../user/domain/entities/user.entity';

export class AuthTokensResult {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly expiresIn: number,
    public readonly user?: User,
  ) {}
}
