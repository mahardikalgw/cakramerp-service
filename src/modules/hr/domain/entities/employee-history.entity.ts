export class EmployeeHistory {
  constructor(public readonly props: {
    id?: string
    employeeId: string
    eventType: string
    description: string
    previousValue?: string
    newValue?: string
    effectiveDate: Date
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get employeeId() { return this.props.employeeId }
  get eventType() { return this.props.eventType }
  get description() { return this.props.description }
  get previousValue() { return this.props.previousValue }
  get newValue() { return this.props.newValue }
  get effectiveDate() { return this.props.effectiveDate }
  get createdAt() { return this.props.createdAt }
}
