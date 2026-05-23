export class UpdateRolePermissionsCommand {
  constructor(
    public readonly roleId: string,
    public readonly permissionIds: string[],
  ) {}
}
