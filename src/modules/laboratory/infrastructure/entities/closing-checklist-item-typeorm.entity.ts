import { Entity, Column, ManyToOne } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { ClosingTypeOrmEntity } from './closing-typeorm.entity';

@Entity('closing_checklist_items')
export class ClosingChecklistItemTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare closingId: string;

  @Column({ type: 'varchar', length: 30 })
  declare itemType: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'boolean', default: false })
  declare completed: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare completedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare completedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @ManyToOne(() => ClosingTypeOrmEntity, (c) => c.items)
  closing: ClosingTypeOrmEntity;
}
