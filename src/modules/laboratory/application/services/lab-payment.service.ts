import { Injectable, Inject } from '@nestjs/common';
import { PaymentMethod } from '../../domain/entities/payment.entity';
import { PaymentEvidence } from '../../domain/entities/payment.entity';
import type { PaymentMethodRepositoryPort } from '../../domain/repositories/payment-repository.port';
import { PAYMENT_METHOD_REPOSITORY } from '../../domain/repositories/payment-repository.port';
import type { PaymentEvidenceRepositoryPort } from '../../domain/repositories/payment-repository.port';
import { PAYMENT_EVIDENCE_REPOSITORY } from '../../domain/repositories/payment-repository.port';
import type { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/lab-purchase-order-repository.port';
import type { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/lab-contract-repository.port';

@Injectable()
export class LabPaymentService {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepositoryPort,
    @Inject(PAYMENT_EVIDENCE_REPOSITORY)
    private readonly paymentEvidenceRepo: PaymentEvidenceRepositoryPort,
    @Inject(LAB_PURCHASE_ORDER_REPOSITORY)
    private readonly poRepo: LabPurchaseOrderRepositoryPort,
    @Inject(LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: LabContractRepositoryPort,
  ) {}

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.paymentMethodRepo.findActive();
  }

  async createPaymentMethod(dto: {
    name: string;
    type: string;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    virtualAccountPattern?: string;
  }): Promise<PaymentMethod> {
    const method = new PaymentMethod({
      name: dto.name,
      type: dto.type as PaymentMethod['type'],
      bankName: dto.bankName ?? null,
      accountNumber: dto.accountNumber ?? null,
      accountHolder: dto.accountHolder ?? null,
      virtualAccountPattern: dto.virtualAccountPattern ?? null,
      isActive: true,
    } as any);
    return this.paymentMethodRepo.save(method);
  }

  async uploadPaymentEvidence(dto: {
    labPurchaseOrderId?: string;
    labContractId?: string;
    amount: number;
    paymentMethodId?: string;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    submittedBy: string;
  }): Promise<PaymentEvidence> {
    const evidence = new PaymentEvidence({
      labPurchaseOrderId: dto.labPurchaseOrderId ?? null,
      labContractId: dto.labContractId ?? null,
      amount: dto.amount,
      paymentMethodId: dto.paymentMethodId ?? null,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType ?? null,
      status: 'pending',
      submittedBy: dto.submittedBy,
      submittedAt: new Date(),
    } as any);

    return this.paymentEvidenceRepo.save(evidence);
  }

  async verifyPaymentEvidence(
    evidenceId: string,
    userId: string,
  ): Promise<PaymentEvidence> {
    const evidence = await this.paymentEvidenceRepo.findById(evidenceId);
    if (!evidence) throw new Error('Payment evidence not found');

    evidence.status = 'verified';
    evidence.verifiedBy = userId;
    evidence.verifiedAt = new Date();

    const saved = await this.paymentEvidenceRepo.save(evidence);

    if (evidence.labPurchaseOrderId) {
      const po = await this.poRepo.findById(evidence.labPurchaseOrderId);
      if (po && po.status === 'signed') {
        po.status = 'paid';
        await this.poRepo.save(po);
      }
    }

    return saved;
  }

  async rejectPaymentEvidence(
    evidenceId: string,
    userId: string,
    reason: string,
  ): Promise<PaymentEvidence> {
    const evidence = await this.paymentEvidenceRepo.findById(evidenceId);
    if (!evidence) throw new Error('Payment evidence not found');

    evidence.status = 'rejected';
    evidence.verifiedBy = userId;
    evidence.verifiedAt = new Date();
    evidence.rejectionReason = reason;

    return this.paymentEvidenceRepo.save(evidence);
  }

  async getPaymentEvidences(
    poId?: string,
    contractId?: string,
  ): Promise<PaymentEvidence[]> {
    if (poId) return this.paymentEvidenceRepo.findByLabPurchaseOrderId(poId);
    if (contractId)
      return this.paymentEvidenceRepo.findByLabContractId(contractId);
    return this.paymentEvidenceRepo.findAll({}).then((r) => r.data);
  }
}
