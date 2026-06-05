import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { QuotationLineTypeOrmEntity } from './quotation-line-typeorm.entity';

@Entity('quotations')
export class QuotationTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare quotationNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'date' })
  declare quotationDate: Date;

  @Column({ type: 'date', nullable: true })
  declare validUntil: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare discountAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare grandTotal: number;

  @Column({ type: 'text', nullable: true })
  declare notes: string | null;

  @OneToMany(() => QuotationLineTypeOrmEntity, (line) => line.quotation, {
    cascade: true,
    eager: true,
  })
  lines: QuotationLineTypeOrmEntity[];
}
