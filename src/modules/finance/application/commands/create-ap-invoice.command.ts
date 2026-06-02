export class CreateAPInvoiceCommand {
  constructor(
    public readonly vendorId: string,
    public readonly vendorName: string,
    public readonly invoiceDate: string,
    public readonly dueDate: string,
    public readonly amount: number,
    public readonly supplierId?: string,
    public readonly supplierInvoiceNumber?: string,
    public readonly poReferenceId?: string,
    public readonly grnReferenceId?: string,
    public readonly paymentTermDays?: number,
    public readonly paymentTermLabel?: string,
    public readonly additionalDiscount?: number,
    public readonly lines?: { description: string; amount: number }[],
  ) {}
}
