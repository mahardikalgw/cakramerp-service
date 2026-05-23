export class ShiftSchedule {
  constructor(public readonly props: {
    id?: string
    employeeId: string
    date: Date
    shiftType: string // day, night, off
    siteId?: string
    siteName?: string
    startTime?: string
    endTime?: string
    notes?: string
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get employeeId() { return this.props.employeeId }
  get date() { return this.props.date }
  get shiftType() { return this.props.shiftType }
  get siteId() { return this.props.siteId }
  get siteName() { return this.props.siteName }
  get startTime() { return this.props.startTime }
  get endTime() { return this.props.endTime }
  get notes() { return this.props.notes }
  get createdAt() { return this.props.createdAt }
}
