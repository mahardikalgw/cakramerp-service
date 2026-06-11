import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { ClosingChecklistItemTypeOrmEntity } from './closing-checklist-item-typeorm.entity';

@Entity('closings')
export class ClosingTypeOrmEntity extends TypeOrmBaseEntity {
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
  declare closedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare closedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare closingReason: string;

  @OneToMany(() => ClosingChecklistItemTypeOrmEntity, (item) => item.closing, {
    cascade: true,
    eager: true,
  })
  items: ClosingChecklistItemTypeOrmEntity[];
}
