export class CreatePositionCommand {
  constructor(
    public readonly name: string,
    public readonly departmentId?: string,
    public readonly description?: string,
  ) {}
}
