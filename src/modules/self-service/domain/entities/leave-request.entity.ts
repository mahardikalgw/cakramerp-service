export class LeaveRequest {
  constructor(public readonly props: {
    id?: string
    employeeId: string
    leaveTypeId: string
    leaveTypeName?: string
    startDate: Date
    endDate: Date
    workingDays: number
    reason: string
    attachmentPath?: string
    status: string // pending, approved, rejected, cancelled
    approvedBy?: string
    approvedAt?: Date
    rejectionReason?: string
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get employeeId() { return this.props.employeeId }
  get leaveTypeId() { return this.props.leaveTypeId }
  get leaveTypeName() { return this.props.leaveTypeName }
  get startDate() { return this.props.startDate }
  get endDate() { return this.props.endDate }
  get workingDays() { return this.props.workingDays }
  get reason() { return this.props.reason }
  get attachmentPath() { return this.props.attachmentPath }
  get status() { return this.props.status }
  get approvedBy() { return this.props.approvedBy }
  get approvedAt() { return this.props.approvedAt }
  get rejectionReason() { return this.props.rejectionReason }
  get createdAt() { return this.props.createdAt }
}
