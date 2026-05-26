import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('ap_invoices')
export class APInvoiceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  invoiceNumber: string

  @Column({ type: 'uuid' })
  vendorId: string

  @Column({ type: 'varchar', length: 255 })
  vendorName: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplierInvoiceNumber: string

  @Column({ type: 'uuid', nullable: true })
  poReferenceId: string

  @Column({ type: 'uuid', nullable: true })
  grnReferenceId: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number

  @Column({ type: 'date' })
  invoiceDate: Date

  @Column({ type: 'date' })
  dueDate: Date

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  threeWayMatchStatus: string

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string

  @Column({ type: 'date', nullable: true })
  scheduledPaymentDate: Date

  @Column({ type: 'uuid', nullable: true })
  supplierId: string

  @Column({ type: 'int', nullable: true })
  paymentTermDays: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTermLabel: string

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  additionalDiscount: number

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string
}
