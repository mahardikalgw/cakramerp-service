export class RecordPaymentCommand {
  constructor(
    public readonly amount: number,
    public readonly paymentDate: string,
    public readonly bankAccountId: string,
    public readonly reference?: string,
  ) {}
}