import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('employee_history')
export class EmployeeHistoryTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare employeeId: string;

  @Column({ type: 'varchar', length: 100 })
  declare eventType: string;

  @Column({ type: 'text' })
  declare description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare previousValue: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare newValue: string;

  @Column({ type: 'date' })
  declare effectiveDate: Date;
}
