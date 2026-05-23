export class StockBalance {
  constructor(
    public readonly props: {
      id?: string
      itemId: string
      warehouseId: string
      quantity: number
      lastMovementDate?: Date
    },
  ) {}
  get id() {
    return this.props.id
  }
  get itemId() {
    return this.props.itemId
  }
  get warehouseId() {
    return this.props.warehouseId
  }
  get quantity() {
    return this.props.quantity
  }
  get lastMovementDate() {
    return this.props.lastMovementDate
  }
}
