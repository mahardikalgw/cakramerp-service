export class CreatePurchaseOrderCommand {
  constructor(
    public readonly supplierId: string,
    public readonly supplierName: string,
    public readonly orderDate: string,
    public readonly expectedDate: string | null,
    public readonly notes: string | null,
    public readonly lines: {
      itemId: string;
      itemName: string;
      quantity: number;
      uom: string;
      unitCost: number;
    }[],
  ) {}
}
