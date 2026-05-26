export class CreateOvertimeRequestCommand {
  constructor(
    public readonly date: string,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly reason?: string,
  ) {}
}