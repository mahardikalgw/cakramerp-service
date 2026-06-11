import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { SalesReturnTypeOrmEntity } from './sales-return-typeorm.entity';

@Entity('sales_return_lines')
export class SalesReturnLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare salesReturnId: string;

  @ManyToOne(() => SalesReturnTypeOrmEntity, (ret) => ret.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sales_return_id' })
  declare salesReturn: SalesReturnTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  declare itemId: string | null;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare uom: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare unitPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare amount: number;

  @Column({ type: 'text', nullable: true })
  declare reason: string | null;
}
