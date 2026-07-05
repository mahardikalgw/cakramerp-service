import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { LabContractSample } from '../../domain/entities/post-approval-lab-contract.entity';
import { PostApprovalLabContractSampleTypeOrmEntity } from '../entities/post-approval-lab-contract-sample-typeorm.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export const LAB_CONTRACT_SAMPLE_REPOSITORY = Symbol(
  'LAB_CONTRACT_SAMPLE_REPOSITORY',
);

export interface LabContractSampleRepositoryPort extends RepositoryPort<LabContractSample> {
  findByContractId(contractId: string): Promise<LabContractSample[]>;
  findBySampleId(sampleId: string): Promise<LabContractSample[]>;
}

@Injectable()
export class LabContractSampleTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    LabContractSample,
    PostApprovalLabContractSampleTypeOrmEntity
  >
  implements LabContractSampleRepositoryPort
{
  protected readonly repository: Repository<PostApprovalLabContractSampleTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(
      PostApprovalLabContractSampleTypeOrmEntity,
    );
  }

  toDomain(
    entity: PostApprovalLabContractSampleTypeOrmEntity,
  ): LabContractSample {
    return new LabContractSample({
      id: entity.id,
      contractId: entity.contractId,
      sampleId: entity.sampleId,
      testingServiceId: entity.testingServiceId,
      serviceName: entity.serviceName,
      sampleCode: entity.sampleCode,
      sampleQuantity: entity.sampleQuantity ?? 1,
      usedQuantity: entity.usedQuantity ?? 0,
      completedQuantity: entity.completedQuantity ?? 0,
      unitPrice: entity.unitPrice ?? 0,
      totalPrice: entity.totalPrice ?? 0,
      status: entity.status as LabContractSample['status'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(
    domain: LabContractSample,
  ): PostApprovalLabContractSampleTypeOrmEntity {
    const entity = new PostApprovalLabContractSampleTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.contractId = domain.contractId;
    entity.sampleId = domain.sampleId;
    entity.testingServiceId = domain.testingServiceId ?? '';
    entity.serviceName = domain.serviceName;
    entity.sampleCode = domain.sampleCode ?? '';
    entity.sampleQuantity = domain.sampleQuantity ?? 1;
    entity.usedQuantity = domain.usedQuantity ?? 0;
    entity.completedQuantity = domain.completedQuantity ?? 0;
    entity.unitPrice = domain.unitPrice ?? 0;
    entity.totalPrice = domain.totalPrice ?? 0;
    entity.status = domain.status;
    return entity;
  }

  async findByContractId(contractId: string): Promise<LabContractSample[]> {
    const entities = await this.repository.find({ where: { contractId } });
    return entities.map((e) => this.toDomain(e));
  }

  async findBySampleId(sampleId: string): Promise<LabContractSample[]> {
    const entities = await this.repository.find({ where: { sampleId } });
    return entities.map((e) => this.toDomain(e));
  }
}
