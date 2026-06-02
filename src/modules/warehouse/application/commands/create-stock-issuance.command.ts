export class CreateStockIssuanceCommand {
  constructor(
    public readonly warehouseId: string,
    public readonly destinationType?: string,
    public readonly destinationId?: string,
    public readonly lines?: {
      itemId: string;
      quantity: number;
      description?: string;
    }[],
  ) {}
}
