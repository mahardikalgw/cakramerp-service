import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { QuotationLineTypeOrmEntity } from './quotation-line-typeorm.entity';

@Entity('quotations')
export class QuotationTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  quotationNumber: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'varchar', length: 255 })
  customerName: string;

  @Column({ type: 'date' })
  quotationDate: Date;

  @Column({ type: 'date', nullable: true })
  validUntil: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => QuotationLineTypeOrmEntity, (line) => line.quotation, {
    cascade: true,
    eager: true,
  })
  lines: QuotationLineTypeOrmEntity[];
}
