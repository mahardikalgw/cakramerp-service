import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('leave_balances')
export class LeaveBalanceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  employeeId: string;

  @Column({ type: 'uuid', name: 'leave_type_id' })
  @Index()
  leaveTypeId: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, name: 'total_days' })
  totalDays: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 1,
    name: 'used_days',
    default: 0,
  })
  usedDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, name: 'remaining_days' })
  remainingDays: number;
}
