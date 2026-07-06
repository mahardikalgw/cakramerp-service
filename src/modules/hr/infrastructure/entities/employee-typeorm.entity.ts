import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('employees')
export class EmployeeTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare employeeNumber: string;

  @Column({ type: 'varchar', length: 255 })
  declare fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare phone: string;

  @Column({ type: 'date', nullable: true })
  declare dateOfBirth: Date;

  @Column({ type: 'text', nullable: true })
  declare address: string;

  @Column({ type: 'varchar', length: 50 })
  declare employmentType: string;

  @Column({ type: 'uuid', nullable: true })
  declare positionId: string;

  @Column({ type: 'uuid', nullable: true })
  declare departmentId: string;

  @Column({ type: 'date' })
  declare joinDate: Date;

  @Column({ type: 'date', nullable: true })
  declare endDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare basicSalary: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare bankAccountNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare bankName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  declare npwp: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare bpjsKesehatanNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare bpjsKetenagakerjaanNumber: string;

  @Column({ type: 'varchar', length: 5, default: '08:00' })
  declare workStartTime: string;

  @Column({ type: 'varchar', length: 5, default: '17:00' })
  declare workEndTime: string;

  @Column({ type: 'int', default: 60 })
  declare breakDurationMinutes: number;
}
