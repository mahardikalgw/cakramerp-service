import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('stock_issuances')
export class StockIssuanceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare issuanceNumber: string;

  @Column({ type: 'uuid' })
  declare warehouseId: string;

  @Column({ type: 'varchar', length: 50 })
  declare destinationType: string;

  @Column({ type: 'uuid' })
  declare destinationId: string;

  @Column({ type: 'varchar', length: 255 })
  declare destinationName: string;

  @Column({ type: 'date' })
  declare issuanceDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'confirmed' })
  declare status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare reversalReason: string;

  @Column({ type: 'timestamp', nullable: true })
  declare reversedAt: Date | undefined;

  @Column({ type: 'uuid' })
  declare createdBy: string | undefined;
}
