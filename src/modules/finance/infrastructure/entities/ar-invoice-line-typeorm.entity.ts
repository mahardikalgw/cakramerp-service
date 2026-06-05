import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('ar_invoice_lines')
export class ARInvoiceLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare invoiceId: string;

  @Column({ type: 'varchar', length: 500 })
  declare description: string;

  @Column({ type: 'integer', default: 1 })
  declare quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  declare taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;
}
