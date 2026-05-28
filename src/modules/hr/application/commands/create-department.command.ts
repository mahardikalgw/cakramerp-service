export class CreateDepartmentCommand {
  constructor(
    public readonly name: string,
    public readonly description?: string,
  ) {}
}
