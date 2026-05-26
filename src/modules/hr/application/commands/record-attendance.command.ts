export class RecordAttendanceCommand {
  constructor(
    public readonly employeeId: string,
    public readonly date: string,
    public readonly clockIn?: string,
    public readonly clockOut?: string,
    public readonly status?: string,
    public readonly notes?: string,
  ) {}
}