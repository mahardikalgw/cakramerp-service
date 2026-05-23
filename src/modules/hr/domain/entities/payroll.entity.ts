export class PayrollRun {
  constructor(public readonly props: {
    id?: string
    month: number
    year: number
    status: string
    totalGross: number
    totalNet: number
    totalEmployees: number
    confirmedAt?: Date
    confirmedBy?: string
    postedAt?: Date
    postedBy?: string
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get month() { return this.props.month }
  get year() { return this.props.year }
  get status() { return this.props.status }
  get totalGross() { return this.props.totalGross }
  get totalNet() { return this.props.totalNet }
  get totalEmployees() { return this.props.totalEmployees }
  get confirmedAt() { return this.props.confirmedAt }
  get confirmedBy() { return this.props.confirmedBy }
  get postedAt() { return this.props.postedAt }
  get postedBy() { return this.props.postedBy }
  get createdAt() { return this.props.createdAt }
}

export class PayrollDetail {
  constructor(public readonly props: {
    id?: string
    payrollRunId: string
    employeeId: string
    employeeName: string
    basicSalary: number
    overtimeHours: number
    overtimePay: number
    siteAllowance: number
    mealAllowance: number
    transportAllowance: number
    grossPay: number
    bpjsKesehatanEmployee: number
    bpjsKesehatanEmployer: number
    bpjsJkk: number
    bpjsJkm: number
    bpjsJhtEmployee: number
    bpjsJhtEmployer: number
    bpjsJpEmployee: number
    bpjsJpEmployer: number
    pph21: number
    netPay: number
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get payrollRunId() { return this.props.payrollRunId }
  get employeeId() { return this.props.employeeId }
  get employeeName() { return this.props.employeeName }
  get basicSalary() { return this.props.basicSalary }
  get overtimeHours() { return this.props.overtimeHours }
  get overtimePay() { return this.props.overtimePay }
  get grossPay() { return this.props.grossPay }
  get netPay() { return this.props.netPay }
  get pph21() { return this.props.pph21 }
  get createdAt() { return this.props.createdAt }
}
