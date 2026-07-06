export class LoginCommand {
  constructor(
    /** Email address or username */
    public readonly identifier: string,
    public readonly password: string,
    public readonly ipAddress?: string,
  ) {}
}
