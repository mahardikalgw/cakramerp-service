import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('employees')
export class EmployeeTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  employeeNumber: string;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50 })
  employmentType: string;

  @Column({ type: 'uuid', nullable: true })
  positionId: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string;

  @Column({ type: 'date' })
  joinDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  basicSalary: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccountNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  npwp: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bpjsKesehatanNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bpjsKetenagakerjaanNumber: string;

  @Column({ type: 'varchar', length: 5, default: '08:00' })
  workStartTime: string;

  @Column({ type: 'varchar', length: 5, default: '17:00' })
  workEndTime: string;

  @Column({ type: 'int', default: 60 })
  breakDurationMinutes: number;
}
