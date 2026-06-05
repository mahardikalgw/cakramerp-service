import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { QuotationTypeOrmEntity } from './quotation-typeorm.entity';

@Entity('quotation_lines')
export class QuotationLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare quotationId: string;

  @ManyToOne(() => QuotationTypeOrmEntity, (quotation) => quotation.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quotationId' })
  declare quotation: QuotationTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  declare itemId: string | null;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'text', nullable: true })
  declare description: string | null;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare uom: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  declare taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare discountAmount: number;

  @Column({ type: 'varchar', length: 50, default: 'goods' })
  declare lineType: string;
}
