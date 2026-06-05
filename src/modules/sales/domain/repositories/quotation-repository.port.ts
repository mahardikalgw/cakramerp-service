import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Quotation } from '../entities/quotation.entity';

export const QUOTATION_REPOSITORY = Symbol('QUOTATION_REPOSITORY');

export interface QuotationRepositoryPort extends RepositoryPort<Quotation> {
  findByQuotationNumber(quotationNumber: string): Promise<Quotation | null>;
  getLastQuotationNumber(prefix: string): Promise<string | null>;
}
