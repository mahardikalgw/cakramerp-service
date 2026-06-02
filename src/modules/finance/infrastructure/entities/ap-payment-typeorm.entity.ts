import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('ap_payments')
export class APPaymentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  vendorId: string;

  @Column({ type: 'varchar', length: 255 })
  vendorName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'date', nullable: true })
  paidDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'scheduled' })
  status: string;

  @Column({ type: 'varchar', length: 100, default: 'operations' })
  category: string;
}
