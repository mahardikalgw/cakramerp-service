export class Employee {
  constructor(public readonly props: {
    id?: string
    employeeNumber: string
    fullName: string
    email?: string
    phone?: string
    dateOfBirth?: Date
    address?: string
    employmentType: string
    positionId?: string
    positionName?: string
    departmentId?: string
    departmentName?: string
    siteId?: string
    siteName?: string
    joinDate: Date
    endDate?: Date
    status: string
    basicSalary: number
    bankAccountNumber?: string
    bankName?: string
    npwp?: string
    bpjsKesehatanNumber?: string
    bpjsKetenagakerjaanNumber?: string
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get employeeNumber() { return this.props.employeeNumber }
  get fullName() { return this.props.fullName }
  get email() { return this.props.email }
  get phone() { return this.props.phone }
  get dateOfBirth() { return this.props.dateOfBirth }
  get address() { return this.props.address }
  get employmentType() { return this.props.employmentType }
  get positionId() { return this.props.positionId }
  get positionName() { return this.props.positionName }
  get departmentId() { return this.props.departmentId }
  get departmentName() { return this.props.departmentName }
  get siteId() { return this.props.siteId }
  get siteName() { return this.props.siteName }
  get joinDate() { return this.props.joinDate }
  get endDate() { return this.props.endDate }
  get status() { return this.props.status }
  get basicSalary() { return this.props.basicSalary }
  get bankAccountNumber() { return this.props.bankAccountNumber }
  get bankName() { return this.props.bankName }
  get npwp() { return this.props.npwp }
  get bpjsKesehatanNumber() { return this.props.bpjsKesehatanNumber }
  get bpjsKetenagakerjaanNumber() { return this.props.bpjsKetenagakerjaanNumber }
  get createdAt() { return this.props.createdAt }
}
