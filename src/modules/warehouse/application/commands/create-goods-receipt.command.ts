export class CreateGoodsReceiptCommand {
  constructor(
    public readonly warehouseId: string,
    public readonly reference?: string,
    public readonly lines?: {
      itemId: string
      quantity: number
      unitCost?: number
    }[],
  ) {}
}