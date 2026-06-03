import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('ar_invoice_lines')
export class ARInvoiceLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  invoiceId: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;
}
