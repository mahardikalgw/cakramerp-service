import { PaymentMethod, PaymentEvidence } from '../entities/payment.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface PaymentMethodRepositoryPort extends RepositoryPort<PaymentMethod> {
  findActive(): Promise<PaymentMethod[]>;
  softDelete(id: string): Promise<void>;
}

export const PAYMENT_METHOD_REPOSITORY = Symbol('PAYMENT_METHOD_REPOSITORY');

export interface PaymentEvidenceRepositoryPort extends RepositoryPort<PaymentEvidence> {
  findByLabPurchaseOrderId(poId: string): Promise<PaymentEvidence[]>;
  findByLabContractId(contractId: string): Promise<PaymentEvidence[]>;
  softDelete(id: string): Promise<void>;
}

export const PAYMENT_EVIDENCE_REPOSITORY = Symbol(
  'PAYMENT_EVIDENCE_REPOSITORY',
);
