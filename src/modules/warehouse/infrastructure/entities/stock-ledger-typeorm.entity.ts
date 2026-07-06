import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('stock_ledger')
export class StockLedgerTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare itemId: string;

  @Column({ type: 'uuid' })
  declare warehouseId: string;

  @Column({ type: 'varchar', length: 50 })
  declare movementType: string;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'integer' })
  declare balanceAfter: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare referenceType: string;

  @Column({ type: 'uuid', nullable: true })
  declare referenceId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare description: string;

  @Column({ type: 'uuid' })
  declare createdBy: string;
}
