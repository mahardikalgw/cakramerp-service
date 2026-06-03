import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { SalesReturnTypeOrmEntity } from './sales-return-typeorm.entity';

@Entity('sales_return_lines')
export class SalesReturnLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  salesReturnId: string;

  @ManyToOne(() => SalesReturnTypeOrmEntity, (ret) => ret.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'salesReturnId' })
  salesReturn: SalesReturnTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  itemId: string | null;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uom: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;
}
