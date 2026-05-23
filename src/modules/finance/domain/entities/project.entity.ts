import { Decimal } from 'decimal.js'
import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity'

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold'

export class Project extends BaseEntity {
  id: string
  name: string
  code: string
  segment: string
  status: ProjectStatus
  budget: Decimal
  actualCost: Decimal
  completionPercent: number
  startDate: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date

  get costOverrunPercent(): number {
    if (this.budget.eq(0)) return 0
    return this.actualCost.minus(this.budget).div(this.budget).times(100).toNumber()
  }

  constructor(props: Partial<Project> & { name: string; code: string; segment: string; budget: Decimal }) {
    super()
    Object.assign(this, props)
    this.status = props.status ?? 'planning'
    this.actualCost = props.actualCost ?? new Decimal(0)
    this.completionPercent = props.completionPercent ?? 0
    this.startDate = props.startDate ?? new Date()
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }
}
