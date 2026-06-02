export class ProfileChangeRequest {
  constructor(
    public readonly props: {
      id?: string;
      employeeId: string;
      fieldName: string;
      oldValue: string;
      newValue: string;
      reason: string;
      status: string; // pending, approved, rejected
      reviewedBy?: string;
      reviewedAt?: Date;
      createdAt?: Date;
    },
  ) {}
  get id() {
    return this.props.id;
  }
  get employeeId() {
    return this.props.employeeId;
  }
  get fieldName() {
    return this.props.fieldName;
  }
  get oldValue() {
    return this.props.oldValue;
  }
  get newValue() {
    return this.props.newValue;
  }
  get reason() {
    return this.props.reason;
  }
  get status() {
    return this.props.status;
  }
  get reviewedBy() {
    return this.props.reviewedBy;
  }
  get reviewedAt() {
    return this.props.reviewedAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
