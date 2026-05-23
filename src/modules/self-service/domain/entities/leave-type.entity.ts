export class LeaveType {
  constructor(public readonly props: {
    id?: string
    name: string
    code: string
    defaultDaysPerYear: number
    isActive: boolean
    createdAt?: Date
  }) {}
  get id() { return this.props.id }
  get name() { return this.props.name }
  get code() { return this.props.code }
  get defaultDaysPerYear() { return this.props.defaultDaysPerYear }
  get isActive() { return this.props.isActive }
  get createdAt() { return this.props.createdAt }
}
