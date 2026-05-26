export class CreateEmployeeCommand {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly employmentType?: string,
    public readonly siteId?: string,
    public readonly departmentId?: string,
    public readonly position?: string,
    public readonly baseSalary?: number,
    public readonly hireDate?: string,
  ) {}
}