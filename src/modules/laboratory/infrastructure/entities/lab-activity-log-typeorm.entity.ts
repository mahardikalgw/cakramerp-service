import { Entity, Column, Index } from 'typeorm';
import { PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('lab_activity_logs')
export class LabActivityLogTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ type: 'uuid', name: 'testing_request_id' })
  @Index()
  declare testingRequestId: string;

  @Column({ type: 'varchar', length: 50 })
  declare action: string;

  @Column({ type: 'uuid', name: 'performed_by' })
  declare performedBy: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'performed_by_name',
  })
  declare performedByName: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'performed_by_role',
  })
  declare performedByRole: string | null;

  @Column({ type: 'jsonb', nullable: true })
  declare details: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Index()
  declare createdAt: Date;
}
