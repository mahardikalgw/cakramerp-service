export class MaintenanceLog {
  constructor(
    public readonly props: {
      id?: string
      equipmentId: string
      maintenanceDate: Date
      hoursAtMaintenance: number
      type: string
      description: string
      cost: number
      performedBy: string
      createdBy: string
      createdAt?: Date
    },
  ) {}
  get id() {
    return this.props.id
  }
  get equipmentId() {
    return this.props.equipmentId
  }
  get maintenanceDate() {
    return this.props.maintenanceDate
  }
  get hoursAtMaintenance() {
    return this.props.hoursAtMaintenance
  }
  get type() {
    return this.props.type
  }
  get description() {
    return this.props.description
  }
  get cost() {
    return this.props.cost
  }
  get performedBy() {
    return this.props.performedBy
  }
  get createdBy() {
    return this.props.createdBy
  }
  get createdAt() {
    return this.props.createdAt
  }
}
