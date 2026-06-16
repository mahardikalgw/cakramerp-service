import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('samples')
export class SampleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare sampleCode: string;

  @Column({ type: 'uuid', nullable: true })
  declare sampleTypeId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare sampleTypeName: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare testingRequestId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare testingRequestNumber: string | null;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  declare weight: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  declare quantity: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare location: string | null;

  @Column({ type: 'text', nullable: true })
  declare description: string | null;

  @Column({ type: 'varchar', length: 50, default: 'awaiting_delivery' })
  declare status: string;

  @Column({ type: 'timestamp', nullable: true })
  declare receivedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare receivedBy: string | null;

  @Column({ type: 'text', nullable: true })
  declare notes: string | null;
}
