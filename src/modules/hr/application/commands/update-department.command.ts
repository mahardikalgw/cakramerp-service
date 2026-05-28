export class UpdateDepartmentCommand {
  constructor(
    public readonly name?: string,
    public readonly description?: string,
    public readonly isActive?: boolean,
  ) {}
}
