import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('tax_invoices')
export class TaxInvoiceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  taxInvoiceNumber: string;

  @Column({ type: 'uuid' })
  arInvoiceId: string;

  @Column({ type: 'date' })
  transactionDate: Date;

  @Column({ type: 'varchar', length: 20 })
  clientNpwp: string;

  @Column({ type: 'varchar', length: 255 })
  clientName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  dpp: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  ppnAmount: number;

  @Column({ type: 'varchar', length: 50, default: 'created' })
  status: string;

  @Column({ type: 'integer' })
  month: number;

  @Column({ type: 'integer' })
  year: number;
}
