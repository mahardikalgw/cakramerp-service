export class OvertimeRequest {
  constructor(
    public readonly props: {
      id?: string;
      employeeId: string;
      date: Date;
      startTime: string;
      endTime: string;
      hours: number;
      reason: string;
      projectReference?: string;
      status: string; // pending, approved, rejected
      approvedBy?: string;
      approvedAt?: Date;
      rejectionReason?: string;
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
  get startTime() {
    return this.props.startTime;
  }
  get endTime() {
    return this.props.endTime;
  }
  get hours() {
    return this.props.hours;
  }
  get reason() {
    return this.props.reason;
  }
  get projectReference() {
    return this.props.projectReference;
  }
  get status() {
    return this.props.status;
  }
  get approvedBy() {
    return this.props.approvedBy;
  }
  get approvedAt() {
    return this.props.approvedAt;
  }
  get rejectionReason() {
    return this.props.rejectionReason;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
