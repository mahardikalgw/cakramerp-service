export class CreateItemCommand {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly category: string,
    public readonly uom: string,
    public readonly minStockLevel?: number,
  ) {}
}