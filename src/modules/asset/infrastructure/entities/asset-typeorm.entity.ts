import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('assets')
export class AssetTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare assetNumber: string;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare category: string;

  @Column({ type: 'date' })
  declare acquisitionDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare acquisitionCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare salvageValue: number;

  @Column({ type: 'int' })
  declare usefulLifeMonths: number;

  @Column({ type: 'varchar', length: 50, default: 'straight_line' })
  declare depreciationMethod: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  declare decliningBalanceRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  declare totalEstimatedUnits: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare unitsProducedToDate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare currentBookValue: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare accumulatedDepreciation: number;

  @Column({ type: 'varchar', length: 20, default: 'monthly' })
  declare depreciationSchedule: string;

  @Column({ type: 'date', nullable: true })
  declare lastDepreciationDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare location: string;

  @Column({ type: 'uuid', nullable: true })
  declare assignedToEmployeeId: string;

  @Column({ type: 'text', nullable: true })
  declare notes: string;
}
