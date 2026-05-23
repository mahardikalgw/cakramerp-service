export class StockIssuance {
  constructor(
    public readonly props: {
      id?: string
      issuanceNumber: string
      warehouseId: string
      destinationType: string
      destinationId: string
      destinationName: string
      issuanceDate: Date
      status: string
      createdBy: string
      reversalReason?: string
      reversedAt?: Date
      createdAt?: Date
    },
  ) {}
  get id() {
    return this.props.id
  }
  get issuanceNumber() {
    return this.props.issuanceNumber
  }
  get warehouseId() {
    return this.props.warehouseId
  }
  get destinationType() {
    return this.props.destinationType
  }
  get destinationId() {
    return this.props.destinationId
  }
  get destinationName() {
    return this.props.destinationName
  }
  get issuanceDate() {
    return this.props.issuanceDate
  }
  get status() {
    return this.props.status
  }
  get createdBy() {
    return this.props.createdBy
  }
  get reversalReason() {
    return this.props.reversalReason
  }
  get reversedAt() {
    return this.props.reversedAt
  }
  get createdAt() {
    return this.props.createdAt
  }
}
