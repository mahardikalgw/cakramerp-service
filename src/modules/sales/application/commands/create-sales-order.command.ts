export class CreateSalesOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly customerName: string,
    public readonly orderDate: string,
    public readonly expectedDeliveryDate: string | null,
    public readonly notes: string | null,
    public readonly lines: {
      itemId: string;
      itemName: string;
      quantity: number;
      uom: string;
      unitPrice: number;
    }[],
  ) {}
}
