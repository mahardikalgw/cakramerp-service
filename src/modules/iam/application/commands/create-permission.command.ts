export class CreatePermissionCommand {
  constructor(
    public readonly name: string,
    public readonly resource: string,
    public readonly action: string,
  ) {}
}
