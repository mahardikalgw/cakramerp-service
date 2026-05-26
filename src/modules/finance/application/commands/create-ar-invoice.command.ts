export class CreateARInvoiceCommand {
  constructor(
    public readonly clientId: string,
    public readonly clientName: string,
    public readonly invoiceDate: string,
    public readonly dueDate: string,
    public readonly lines: {
      description: string
      quantity: number
      unitPrice: number
      taxPercent: number
    }[],
    public readonly customerId?: string,
    public readonly segment?: string,
    public readonly projectId?: string,
    public readonly sendEmail?: boolean,
    public readonly paymentTermDays?: number,
    public readonly paymentTermLabel?: string,
    public readonly additionalDiscount?: number,
    public readonly asDraft?: boolean,
  ) {}
}