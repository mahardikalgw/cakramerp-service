import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('report_distributions')
export class ReportDistributionTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  declare documentType: string;

  @Column({ type: 'uuid' })
  declare documentId: string;

  @Column({ type: 'varchar', length: 50 })
  declare documentNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare customerName: string;

  @Column({ type: 'varchar', length: 20 })
  declare channel: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare recipientEmail: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare recipientName: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  declare status: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare sentAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  declare deliveredAt: Date;

  @Column({ type: 'text', nullable: true })
  declare failureReason: string;

  @Column({ type: 'int', default: 0 })
  declare retryCount: number;
}
