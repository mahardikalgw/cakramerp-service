import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { QuotationTypeOrmEntity } from './quotation-typeorm.entity';

@Entity('quotation_lines')
export class QuotationLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  quotationId: string;

  @ManyToOne(() => QuotationTypeOrmEntity, (quotation) => quotation.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quotationId' })
  quotation: QuotationTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  itemId: string | null;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uom: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'varchar', length: 50, default: 'goods' })
  lineType: string;
}
