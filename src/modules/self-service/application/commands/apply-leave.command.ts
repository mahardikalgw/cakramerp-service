export class ApplyLeaveCommand {
  constructor(
    public readonly leaveTypeId: string,
    public readonly startDate: string,
    public readonly endDate: string,
    public readonly reason?: string,
    public readonly halfDay?: boolean,
  ) {}
}