import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('asset_depreciations')
export class AssetDepreciationTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ type: 'uuid' })
  declare assetId: string;

  @Column({ type: 'date' })
  declare periodDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare depreciationAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare accumulatedDepreciation: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare bookValueAfter: number;

  @Column({ type: 'varchar', length: 50 })
  declare methodUsed: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  declare unitsProduced: number;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  declare createdAt: Date;
}
