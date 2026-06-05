import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('stock_opname_sessions')
export class StockOpnameSessionTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare warehouseId: string;

  @Column({ type: 'varchar', length: 255 })
  declare warehouseName: string;

  @Column({ type: 'uuid' })
  declare conductedBy: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'timestamp', nullable: true })
  declare submittedAt: Date | undefined;

  @Column({ type: 'uuid', nullable: true })
  declare approvedBy: string | undefined;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date | undefined;

  @Column({ type: 'text', nullable: true })
  declare notes: string;
}
