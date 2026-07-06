import { Entity, Column, ManyToOne } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { VerificationTypeOrmEntity } from './verification-typeorm.entity';

@Entity('verification_checklist_items')
export class VerificationChecklistItemTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare verificationId: string;

  @Column({ type: 'varchar', length: 30 })
  declare itemType: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare documentUrl: string;

  @Column({ type: 'boolean', default: false })
  declare verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare verifiedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare verifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @ManyToOne(() => VerificationTypeOrmEntity, (v) => v.items)
  verification: VerificationTypeOrmEntity;
}
