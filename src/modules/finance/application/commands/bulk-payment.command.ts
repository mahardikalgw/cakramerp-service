export class BulkPaymentCommand {
  constructor(
    public readonly invoiceIds: string[],
    public readonly bankAccountId: string,
    public readonly paymentDate: string,
    public readonly reference?: string,
  ) {}
}