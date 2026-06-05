import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('tax_invoices')
export class TaxInvoiceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare taxInvoiceNumber: string;

  @Column({ type: 'uuid' })
  declare arInvoiceId: string;

  @Column({ type: 'date' })
  declare transactionDate: Date;

  @Column({ type: 'varchar', length: 20 })
  declare clientNpwp: string;

  @Column({ type: 'varchar', length: 255 })
  declare clientName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare dpp: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare ppnAmount: number;

  @Column({ type: 'varchar', length: 50, default: 'created' })
  declare status: string;

  @Column({ type: 'integer' })
  declare month: number;

  @Column({ type: 'integer' })
  declare year: number;
}
