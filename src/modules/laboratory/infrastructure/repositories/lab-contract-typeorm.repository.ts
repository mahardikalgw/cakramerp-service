import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  LabContract,
  LabContractAttachment,
} from '../../domain/entities/lab-contract.entity';
import { LabContractTypeOrmEntity } from '../entities/lab-contract-typeorm.entity';
import { LabContractAttachmentTypeOrmEntity } from '../entities/lab-contract-attachment-typeorm.entity';
import { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';

@Injectable()
export class LabContractTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<LabContract, LabContractTypeOrmEntity>
  implements LabContractRepositoryPort
{
  protected readonly repository: Repository<LabContractTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(LabContractTypeOrmEntity);
  }

  toDomain(entity: LabContractTypeOrmEntity): LabContract {
    return new LabContract({
      id: entity.id,
      contractNumber: entity.contractNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      projectId: entity.projectId,
      projectName: entity.projectName,
      startDate: entity.startDate,
      endDate: entity.endDate,
      contractValue: Number(entity.contractValue),
      totalQuota: entity.totalQuota,
      usedQuota: entity.usedQuota,
      remainingQuota: entity.remainingQuota,
      status: entity.status as LabContract['status'],
      createdBy: entity.createdBy,
      approvedBy: entity.approvedBy,
      approvedAt: entity.approvedAt,
      attachments: Array.isArray(entity.attachments)
        ? entity.attachments.map(
            (a) =>
              new LabContractAttachment({
                id: a.id,
                labContractId: a.labContractId,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                fileType: a.fileType,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: LabContract): LabContractTypeOrmEntity {
    const entity = new LabContractTypeOrmEntity();
    entity.id = domain.id;
    entity.contractNumber = domain.contractNumber;
    entity.customerId = domain.customerId || (null as any);
    entity.customerName = domain.customerName ?? '';
    entity.projectId = domain.projectId || (null as any);
    entity.projectName = domain.projectName ?? '';
    entity.startDate =
      domain.startDate instanceof Date
        ? domain.startDate
        : new Date(domain.startDate ?? '');
    entity.endDate =
      domain.endDate instanceof Date
        ? domain.endDate
        : new Date(domain.endDate ?? '');
    entity.contractValue = domain.contractValue ?? 0;
    entity.totalQuota = domain.totalQuota ?? 0;
    entity.usedQuota = domain.usedQuota ?? 0;
    entity.remainingQuota = domain.remainingQuota ?? 0;
    entity.status = domain.status ?? 'draft';
    entity.createdBy = domain.createdBy ?? '';
    entity.approvedBy = domain.approvedBy ?? '';
    entity.approvedAt = domain.approvedAt
      ? new Date(domain.approvedAt)
      : new Date();
    entity.attachments = domain.attachments?.map((a) => {
      const attEntity = new LabContractAttachmentTypeOrmEntity();
      attEntity.id = a.id;
      attEntity.labContractId = a.labContractId;
      attEntity.fileName = a.fileName;
      attEntity.fileUrl = a.fileUrl;
      attEntity.fileType = a.fileType ?? '';
      attEntity.uploadedAt = a.createdAt;
      return attEntity;
    });
    return entity;
  }

  async findByContractNumber(
    contractNumber: string,
  ): Promise<LabContract | null> {
    const entity = await this.repository.findOne({
      where: { contractNumber },
      relations: ['attachments'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastContractNumber(): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('lc')
      .select('lc.contract_number', 'contractNumber')
      .orderBy('lc.contract_number', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.contractNumber ?? null;
  }
}
