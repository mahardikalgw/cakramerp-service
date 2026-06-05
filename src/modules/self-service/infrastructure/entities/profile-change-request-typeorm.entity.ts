import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('profile_change_requests')
export class ProfileChangeRequestTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  declare employeeId: string;

  @Column({ type: 'varchar', length: 100, name: 'field_name' })
  declare fieldName: string;

  @Column({ type: 'text', name: 'old_value' })
  declare oldValue: string;

  @Column({ type: 'text', name: 'new_value' })
  declare newValue: string;

  @Column({ type: 'text' })
  declare reason: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  declare status: string;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  declare reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  declare reviewedAt: Date | null;
}
