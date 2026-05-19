export class AuthTokensResult {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly expiresIn: number,
  ) {}
}
