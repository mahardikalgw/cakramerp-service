import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseRequestLineTypeOrmEntity } from './purchase-request-line-typeorm.entity';

@Entity('purchase_requests')
export class PurchaseRequestTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  prNumber: string;

  @Column({ type: 'uuid' })
  requestedBy: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  departmentName: string;

  @Column({ type: 'date' })
  requestDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  priority: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @OneToMany(
    () => PurchaseRequestLineTypeOrmEntity,
    (line) => line.purchaseRequest,
    { cascade: true, eager: true },
  )
  lines: PurchaseRequestLineTypeOrmEntity[];
}
