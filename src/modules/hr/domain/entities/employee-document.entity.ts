export class EmployeeDocument {
  constructor(public readonly props: {
    id?: string
    employeeId: string
    type: string
    fileName: string
    filePath: string
    expiryDate?: Date
    uploadedAt?: Date
  }) {}
  get id() { return this.props.id }
  get employeeId() { return this.props.employeeId }
  get type() { return this.props.type }
  get fileName() { return this.props.fileName }
  get filePath() { return this.props.filePath }
  get expiryDate() { return this.props.expiryDate }
  get uploadedAt() { return this.props.uploadedAt }
}
