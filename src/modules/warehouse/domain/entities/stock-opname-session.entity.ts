export class StockOpnameSession {
  constructor(
    public readonly props: {
      id?: string
      warehouseId: string
      warehouseName: string
      conductedBy: string
      status: string
      submittedAt?: Date
      approvedBy?: string
      approvedAt?: Date
      createdAt?: Date
    },
  ) {}
  get id() {
    return this.props.id
  }
  get warehouseId() {
    return this.props.warehouseId
  }
  get warehouseName() {
    return this.props.warehouseName
  }
  get conductedBy() {
    return this.props.conductedBy
  }
  get status() {
    return this.props.status
  }
  get submittedAt() {
    return this.props.submittedAt
  }
  get approvedBy() {
    return this.props.approvedBy
  }
  get approvedAt() {
    return this.props.approvedAt
  }
  get createdAt() {
    return this.props.createdAt
  }
}
