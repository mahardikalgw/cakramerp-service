export class AttendanceRecord {
  constructor(
    public readonly props: {
      id?: string;
      employeeId: string;
      date: Date;
      clockIn?: Date;
      clockOut?: Date;
      status: string;
      absenceReason?: string;
      overtimeHours: number;
      isImported: boolean;
      createdAt?: Date;
    },
  ) {}
  get id() {
    return this.props.id;
  }
  get employeeId() {
    return this.props.employeeId;
  }
  get date() {
    return this.props.date;
  }
  get clockIn() {
    return this.props.clockIn;
  }
  get clockOut() {
    return this.props.clockOut;
  }
  get status() {
    return this.props.status;
  }
  get absenceReason() {
    return this.props.absenceReason;
  }
  get overtimeHours() {
    return this.props.overtimeHours;
  }
  get isImported() {
    return this.props.isImported;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
