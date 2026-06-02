import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('asset_depreciations')
export class AssetDepreciationTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assetId: string;

  @Column({ type: 'date' })
  periodDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  depreciationAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  accumulatedDepreciation: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  bookValueAfter: number;

  @Column({ type: 'varchar', length: 50 })
  methodUsed: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  unitsProduced: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
