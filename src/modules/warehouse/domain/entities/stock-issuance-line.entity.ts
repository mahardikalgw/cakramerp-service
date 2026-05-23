export class StockIssuanceLine {
  constructor(
    public readonly props: {
      id?: string
      issuanceId: string
      itemId: string
      itemName: string
      quantity: number
      uom: string
    },
  ) {}
  get id() {
    return this.props.id
  }
  get issuanceId() {
    return this.props.issuanceId
  }
  get itemId() {
    return this.props.itemId
  }
  get itemName() {
    return this.props.itemName
  }
  get quantity() {
    return this.props.quantity
  }
  get uom() {
    return this.props.uom
  }
}
