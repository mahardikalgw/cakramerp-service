import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('ar_invoices')
export class ARInvoiceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  invoiceNumber: string

  @Column({ type: 'varchar', length: 100 })
  clientId: string

  @Column({ type: 'varchar', length: 255 })
  clientName: string

  @Column({ type: 'uuid', nullable: true })
  projectId: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  segment: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number

  @Column({ type: 'date' })
  dueDate: Date

  @Column({ type: 'date' })
  issueDate: Date

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string

  @Column({ type: 'uuid', nullable: true })
  customerId: string

  @Column({ type: 'int', nullable: true })
  paymentTermDays: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTermLabel: string

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  additionalDiscount: number

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string
}
