export class CreateARInvoiceCommand {
  constructor(
    public readonly clientId: string,
    public readonly clientName: string,
    public readonly invoiceDate: string,
    public readonly dueDate: string,
    public readonly lines: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxPercent: number;
      testResultId?: string;
      sampleCode?: string;
    }[],
    public readonly customerId?: string,
    public readonly segment?: string,
    public readonly projectId?: string,
    public readonly sendEmail?: boolean,
    public readonly paymentTermDays?: number,
    public readonly paymentTermLabel?: string,
    public readonly additionalDiscount?: number,
    public readonly asDraft?: boolean,
    // Lab billing fields — single source of truth for all billing types
    public readonly sourceType?: string,
    public readonly sourceId?: string,
    public readonly contractId?: string,
    public readonly testingScheduleId?: string,
    public readonly billingPeriodStart?: string,
    public readonly billingPeriodEnd?: string,
    public readonly totalSamples?: number,
    public readonly initialFeeApplied?: number,
  ) {}
}
