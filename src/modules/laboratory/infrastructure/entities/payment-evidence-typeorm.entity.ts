import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('payment_evidences')
export class PaymentEvidenceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', nullable: true })
  declare labPurchaseOrderId: string;

  @Column({ type: 'uuid', nullable: true })
  declare labContractId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;

  @Column({ type: 'uuid', nullable: true })
  declare paymentMethodId: string;

  @Column({ type: 'varchar', length: 255 })
  declare fileName: string;

  @Column({ type: 'varchar', length: 500 })
  declare fileUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare fileType: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare verifiedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare verifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare submittedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare submittedAt: Date;
}
