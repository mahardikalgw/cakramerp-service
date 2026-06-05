import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { TestingRequestLineTypeOrmEntity } from './testing-request-line-typeorm.entity';

@Entity('testing_requests')
export class TestingRequestTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare requestNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare projectName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare projectLocation: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare testingType: string;

  @Column({ type: 'int', nullable: true })
  declare sampleQuantity: number;

  @Column({ type: 'date', nullable: true })
  declare scheduleDate: Date;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date | undefined;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  @OneToMany(
    () => TestingRequestLineTypeOrmEntity,
    (line) => line.testingRequest,
    {
      cascade: true,
      eager: true,
    },
  )
  lines: TestingRequestLineTypeOrmEntity[];
}
