export class BpjsEnrollment {
  constructor(
    public readonly props: {
      id?: string;
      employeeId: string;
      employeeName: string;
      bpjsKesehatanNumber?: string;
      bpjsKetenagakerjaanNumber?: string;
      enrollmentDate: Date;
      status: string;
      createdAt?: Date;
    },
  ) {}
  get id() {
    return this.props.id;
  }
  get employeeId() {
    return this.props.employeeId;
  }
  get employeeName() {
    return this.props.employeeName;
  }
  get bpjsKesehatanNumber() {
    return this.props.bpjsKesehatanNumber;
  }
  get bpjsKetenagakerjaanNumber() {
    return this.props.bpjsKetenagakerjaanNumber;
  }
  get enrollmentDate() {
    return this.props.enrollmentDate;
  }
  get status() {
    return this.props.status;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
