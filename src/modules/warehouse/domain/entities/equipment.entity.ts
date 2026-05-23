export class Equipment {
  constructor(
    public readonly props: {
      id?: string
      unitId: string
      type: string
      brand: string
      model: string
      year: number
      siteId?: string
      siteName?: string
      status: string
      currentHours: number
      createdAt?: Date
    },
  ) {}
  get id() {
    return this.props.id
  }
  get unitId() {
    return this.props.unitId
  }
  get type() {
    return this.props.type
  }
  get brand() {
    return this.props.brand
  }
  get model() {
    return this.props.model
  }
  get year() {
    return this.props.year
  }
  get siteId() {
    return this.props.siteId
  }
  get siteName() {
    return this.props.siteName
  }
  get status() {
    return this.props.status
  }
  get currentHours() {
    return this.props.currentHours
  }
  get createdAt() {
    return this.props.createdAt
  }
}
