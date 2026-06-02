import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('stock_opname_sessions')
export class StockOpnameSessionTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'varchar', length: 255 })
  warehouseName: string;

  @Column({ type: 'uuid' })
  conductedBy: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
