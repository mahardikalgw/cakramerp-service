import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { ContractTestInvoiceTypeOrmEntity } from './contract-test-invoice-typeorm.entity';

@Entity('contract_test_invoice_results')
export class ContractTestInvoiceResultTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid', name: 'invoice_id' })
  declare invoiceId: string;

  @Column({ type: 'uuid', name: 'test_result_id', unique: true })
  declare testResultId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare serviceName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare sampleCode: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare unitPrice: number;

  @Column({ type: 'int', default: 1 })
  declare quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalPrice: number;

  @ManyToOne(
    () => ContractTestInvoiceTypeOrmEntity,
    (invoice) => invoice.lines,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'invoice_id' })
  invoice: ContractTestInvoiceTypeOrmEntity;
}
