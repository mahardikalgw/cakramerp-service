import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('ap_payments')
export class APPaymentTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 100 })
  declare vendorId: string;

  @Column({ type: 'varchar', length: 255 })
  declare vendorName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;

  @Column({ type: 'date' })
  declare scheduledDate: Date;

  @Column({ type: 'date', nullable: true })
  declare paidDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'scheduled' })
  declare status: string;

  @Column({ type: 'varchar', length: 100, default: 'operations' })
  declare category: string;
}
