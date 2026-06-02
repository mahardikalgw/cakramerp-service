export class SchedulePaymentCommand {
  constructor(
    public readonly dueDate: string,
    public readonly bankAccountId: string,
  ) {}
}
