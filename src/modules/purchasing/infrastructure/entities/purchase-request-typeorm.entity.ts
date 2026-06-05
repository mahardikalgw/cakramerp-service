import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseRequestLineTypeOrmEntity } from './purchase-request-line-typeorm.entity';

@Entity('purchase_requests')
export class PurchaseRequestTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare prNumber: string;

  @Column({ type: 'uuid' })
  declare requestedBy: string;

  @Column({ type: 'uuid', nullable: true })
  declare departmentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare departmentName: string;

  @Column({ type: 'date' })
  declare requestDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  declare priority: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare discountAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare grandTotal: number;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @Column({ type: 'uuid', nullable: true })
  declare approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  @OneToMany(
    () => PurchaseRequestLineTypeOrmEntity,
    (line) => line.purchaseRequest,
    { cascade: true, eager: true },
  )
  lines: PurchaseRequestLineTypeOrmEntity[];
}
