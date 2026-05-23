export class UpdateUserCommand {
  constructor(
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly status?: string,
    public readonly roleIds?: string[],
  ) {}
}
