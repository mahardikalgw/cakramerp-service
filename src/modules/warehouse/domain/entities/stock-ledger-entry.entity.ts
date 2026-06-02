export class StockLedgerEntry {
  constructor(
    public readonly props: {
      id?: string;
      itemId: string;
      warehouseId: string;
      movementType: string;
      quantity: number;
      balanceAfter: number;
      referenceType?: string;
      referenceId?: string;
      description?: string;
      createdBy: string;
      createdAt?: Date;
    },
  ) {}
  get id() {
    return this.props.id;
  }
  get itemId() {
    return this.props.itemId;
  }
  get warehouseId() {
    return this.props.warehouseId;
  }
  get movementType() {
    return this.props.movementType;
  }
  get quantity() {
    return this.props.quantity;
  }
  get balanceAfter() {
    return this.props.balanceAfter;
  }
  get referenceType() {
    return this.props.referenceType;
  }
  get referenceId() {
    return this.props.referenceId;
  }
  get description() {
    return this.props.description;
  }
  get createdBy() {
    return this.props.createdBy;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
