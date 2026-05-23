export class GoodsReceipt {
  constructor(
    public readonly props: {
      id?: string
      grnNumber: string
      poId?: string
      warehouseId: string
      vendorName: string
      receivedDate: Date
      notes?: string
      status: string
      createdBy: string
      createdAt?: Date
    },
  ) {}
  get id() {
    return this.props.id
  }
  get grnNumber() {
    return this.props.grnNumber
  }
  get poId() {
    return this.props.poId
  }
  get warehouseId() {
    return this.props.warehouseId
  }
  get vendorName() {
    return this.props.vendorName
  }
  get receivedDate() {
    return this.props.receivedDate
  }
  get notes() {
    return this.props.notes
  }
  get status() {
    return this.props.status
  }
  get createdBy() {
    return this.props.createdBy
  }
  get createdAt() {
    return this.props.createdAt
  }
}
