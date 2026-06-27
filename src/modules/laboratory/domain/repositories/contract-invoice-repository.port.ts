import { ContractInvoice } from '../entities/contract-invoice.entity';
import {
  FindOptions,
  FindResult,
} from '../../../../shared/kernel/domain/repositories/repository.port';

export const CONTRACT_INVOICE_REPOSITORY = Symbol(
  'CONTRACT_INVOICE_REPOSITORY',
);

export interface ContractInvoiceRepositoryPort {
  save(entity: ContractInvoice): Promise<ContractInvoice>;
  findById(id: string): Promise<ContractInvoice | null>;
  findByContractId(contractId: string): Promise<ContractInvoice[]>;
  findByBillingPeriod(
    contractId: string,
    start: Date,
    end: Date,
  ): Promise<ContractInvoice | null>;
  getLastInvoiceNumber(): Promise<string | null>;
  findAll(options?: FindOptions): Promise<FindResult<ContractInvoice>>;
}
