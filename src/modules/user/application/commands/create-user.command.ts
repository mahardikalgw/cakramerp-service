export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly roleIds?: string[],
    public readonly status?: 'active' | 'inactive' | 'suspended',
    public readonly username?: string,
  ) {}
}
