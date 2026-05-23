export class DiscrepancyReport {
  constructor(public readonly props: {
    id?: string
    employeeId: string
    attendanceDate: Date
    description: string
    status: string // pending, resolved, rejected
    resolvedBy?: string
    resolvedAt?: Date
    resolution?: string
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get employeeId() { return this.props.employeeId }
  get attendanceDate() { return this.props.attendanceDate }
  get description() { return this.props.description }
  get status() { return this.props.status }
  get resolvedBy() { return this.props.resolvedBy }
  get resolvedAt() { return this.props.resolvedAt }
  get resolution() { return this.props.resolution }
  get createdAt() { return this.props.createdAt }
}
