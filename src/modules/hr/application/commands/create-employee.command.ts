export class CreateEmployeeCommand {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly employmentType?: string,
    public readonly departmentId?: string,
    public readonly positionId?: string,
    public readonly baseSalary?: number,
    public readonly hireDate?: string,
    public readonly workStartTime?: string,
    public readonly workEndTime?: string,
    public readonly breakDurationMinutes?: number,
  ) {}
}
