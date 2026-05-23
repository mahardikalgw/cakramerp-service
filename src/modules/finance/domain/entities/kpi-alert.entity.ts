import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity'

export type KpiAlertStatus = 'unread' | 'read' | 'dismissed'

export class KpiAlert extends BaseEntity {
  id: string
  type: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: KpiAlertStatus
  relatedValue: number
  thresholdValue: number
  relatedUrl?: string
  createdAt: Date
  updatedAt: Date

  constructor(props: Partial<KpiAlert> & { type: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical'; relatedValue: number; thresholdValue: number }) {
    super()
    Object.assign(this, props)
    this.status = props.status ?? 'unread'
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }
}
