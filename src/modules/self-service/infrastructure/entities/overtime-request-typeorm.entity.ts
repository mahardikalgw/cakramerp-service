import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('overtime_requests')
export class OvertimeRequestTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  declare employeeId: string;

  @Column({ type: 'date' })
  declare date: Date;

  @Column({ type: 'time', name: 'start_time' })
  declare startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  declare endTime: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  declare hours: number;

  @Column({ type: 'text' })
  declare reason: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'project_reference',
  })
  projectReference: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  declare status: string;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  declare approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  declare approvedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  declare rejectionReason: string | null;
}
