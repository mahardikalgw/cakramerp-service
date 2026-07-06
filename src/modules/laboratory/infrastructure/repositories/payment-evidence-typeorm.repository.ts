import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { PaymentEvidence } from '../../domain/entities/payment.entity';
import { PaymentEvidenceTypeOrmEntity } from '../entities/payment-evidence-typeorm.entity';
import { PaymentEvidenceRepositoryPort } from '../../domain/repositories/payment-repository.port';

@Injectable()
export class PaymentEvidenceTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    PaymentEvidence,
    PaymentEvidenceTypeOrmEntity
  >
  implements PaymentEvidenceRepositoryPort
{
  protected readonly repository: Repository<PaymentEvidenceTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(PaymentEvidenceTypeOrmEntity);
  }

  toDomain(entity: PaymentEvidenceTypeOrmEntity): PaymentEvidence {
    return new PaymentEvidence({
      id: entity.id,
      labPurchaseOrderId: entity.labPurchaseOrderId,
      labContractId: entity.labContractId,
      amount: Number(entity.amount),
      paymentMethodId: entity.paymentMethodId,
      fileName: entity.fileName,
      fileUrl: entity.fileUrl,
      fileType: entity.fileType,
      status: entity.status as PaymentEvidence['status'],
      verifiedBy: entity.verifiedBy,
      verifiedAt: entity.verifiedAt,
      rejectionReason: entity.rejectionReason,
      submittedBy: entity.submittedBy,
      submittedAt: entity.submittedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: PaymentEvidence): PaymentEvidenceTypeOrmEntity {
    const entity = new PaymentEvidenceTypeOrmEntity();
    entity.id = domain.id;
    entity.labPurchaseOrderId = domain.labPurchaseOrderId || (null as any);
    entity.labContractId = domain.labContractId || (null as any);
    entity.amount = domain.amount;
    entity.paymentMethodId = domain.paymentMethodId || (null as any);
    entity.fileName = domain.fileName;
    entity.fileUrl = domain.fileUrl;
    entity.fileType = domain.fileType ?? '';
    entity.status = domain.status ?? 'pending';
    entity.verifiedBy = domain.verifiedBy ?? '';
    entity.verifiedAt = domain.verifiedAt ?? new Date();
    entity.rejectionReason = domain.rejectionReason ?? '';
    entity.submittedBy = domain.submittedBy ?? '';
    entity.submittedAt = domain.submittedAt ?? new Date();
    return entity;
  }

  async findByLabPurchaseOrderId(poId: string): Promise<PaymentEvidence[]> {
    const entities = await this.repository.find({
      where: { labPurchaseOrderId: poId, deletedAt: IsNull() } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByLabContractId(contractId: string): Promise<PaymentEvidence[]> {
    const entities = await this.repository.find({
      where: { labContractId: contractId, deletedAt: IsNull() } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
