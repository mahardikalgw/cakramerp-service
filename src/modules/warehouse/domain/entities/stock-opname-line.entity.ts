export class StockOpnameLine {
  constructor(
    public readonly props: {
      id?: string
      sessionId: string
      itemId: string
      itemName: string
      systemQty: number
      actualQty: number
      varianceQty: number
      uom: string
    },
  ) {}
  get id() {
    return this.props.id
  }
  get sessionId() {
    return this.props.sessionId
  }
  get itemId() {
    return this.props.itemId
  }
  get itemName() {
    return this.props.itemName
  }
  get systemQty() {
    return this.props.systemQty
  }
  get actualQty() {
    return this.props.actualQty
  }
  get varianceQty() {
    return this.props.varianceQty
  }
  get uom() {
    return this.props.uom
  }
}
