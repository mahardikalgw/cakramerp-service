import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('employee_history')
export class EmployeeHistoryTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  previousValue: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  newValue: string;

  @Column({ type: 'date' })
  effectiveDate: Date;
}
