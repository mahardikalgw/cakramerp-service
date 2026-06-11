import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { VerificationChecklistItemTypeOrmEntity } from './verification-checklist-item-typeorm.entity';

@Entity('verifications')
export class VerificationTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 20 })
  declare entityType: string;

  @Column({ type: 'uuid' })
  declare entityId: string;

  @Column({ type: 'varchar', length: 50 })
  declare entityNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare verifiedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare verifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare activatedAt: Date;

  @OneToMany(
    () => VerificationChecklistItemTypeOrmEntity,
    (item) => item.verification,
    { cascade: true, eager: true },
  )
  items: VerificationChecklistItemTypeOrmEntity[];
}
