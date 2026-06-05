import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('bpjs_enrollments')
export class BpjsEnrollmentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare employeeId: string;

  @Column({ type: 'varchar', length: 50 })
  declare program: string;

  @Column({ type: 'varchar', length: 100 })
  declare memberNumber: string;

  @Column({ type: 'date' })
  declare enrollmentDate: Date;

  @Column({ type: 'date', nullable: true })
  declare endDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare salary: number;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
