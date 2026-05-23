export class LeaveBalance {
  constructor(public readonly props: {
    id?: string
    employeeId: string
    leaveTypeId: string
    leaveTypeName?: string
    year: number
    totalDays: number
    usedDays: number
    remainingDays: number
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get employeeId() { return this.props.employeeId }
  get leaveTypeId() { return this.props.leaveTypeId }
  get leaveTypeName() { return this.props.leaveTypeName }
  get year() { return this.props.year }
  get totalDays() { return this.props.totalDays }
  get usedDays() { return this.props.usedDays }
  get remainingDays() { return this.props.remainingDays }
  get createdAt() { return this.props.createdAt }
}
