export class UpdatePositionCommand {
  constructor(
    public readonly name?: string,
    public readonly departmentId?: string,
    public readonly description?: string,
    public readonly isActive?: boolean,
  ) {}
}
