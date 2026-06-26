import { ContractTestInvoice } from '../entities/contract-test-invoice.entity';
import { FindOptions, FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';

export const CONTRACT_TEST_INVOICE_REPOSITORY = 'CONTRACT_TEST_INVOICE_REPOSITORY';

export interface ContractTestInvoiceRepositoryPort {
  save(invoice: ContractTestInvoice): Promise<ContractTestInvoice>;
  findById(id: string): Promise<ContractTestInvoice | null>;
  findByContractId(contractId: string): Promise<ContractTestInvoice[]>;
  findByCustomerId(
    customerId: string,
    options?: { status?: string; page?: number; limit?: number },
  ): Promise<{ data: ContractTestInvoice[]; total: number }>;
  findAll(options?: FindOptions): Promise<FindResult<ContractTestInvoice>>;
  getLastInvoiceNumber(): Promise<string | null>;
  /** Sum of `initial_fee_applied` across all non-cancelled invoices for a contract. */
  sumInitialFeeApplied(contractId: string): Promise<number>;
}
