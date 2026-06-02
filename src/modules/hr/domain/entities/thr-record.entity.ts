export class ThrRecord {
  constructor(
    public readonly props: {
      id?: string;
      employeeId: string;
      employeeName: string;
      year: number;
      monthsOfService: number;
      basicSalary: number;
      thrAmount: number;
      status: string;
      confirmedAt?: Date;
      confirmedBy?: string;
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
  get year() {
    return this.props.year;
  }
  get monthsOfService() {
    return this.props.monthsOfService;
  }
  get basicSalary() {
    return this.props.basicSalary;
  }
  get thrAmount() {
    return this.props.thrAmount;
  }
  get status() {
    return this.props.status;
  }
  get confirmedAt() {
    return this.props.confirmedAt;
  }
  get confirmedBy() {
    return this.props.confirmedBy;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
