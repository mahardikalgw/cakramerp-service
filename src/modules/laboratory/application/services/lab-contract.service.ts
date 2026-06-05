import { Injectable, Inject } from '@nestjs/common';
import { LabContract } from '../../domain/entities/lab-contract.entity';
import type { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/lab-contract-repository.port';

@Injectable()
export class LabContractService {
  constructor(
    @Inject(LAB_CONTRACT_REPOSITORY)
    private readonly repository: LabContractRepositoryPort,
  ) {}

  async findAll(options?: {
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.customerId) filters.customerId = options.customerId;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<LabContract | null> {
    return this.repository.findById(id);
  }

  async findByContractNumber(
    contractNumber: string,
  ): Promise<LabContract | null> {
    return this.repository.findByContractNumber(contractNumber);
  }

  private generateContractNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/CTR-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `CTR-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async getLastContractNumber(): Promise<string | null> {
    return this.repository.getLastContractNumber();
  }

  async create(dto: {
    customerId: string;
    customerName: string;
    projectName?: string;
    startDate?: string;
    endDate?: string;
    contractValue?: number;
    totalQuota?: number;
    lines?: any[];
  }): Promise<LabContract> {
    const lastNumber = await this.getLastContractNumber();
    const contractNumber = this.generateContractNumber(lastNumber);

    const entity = new LabContract({
      updatedAt: undefined,
      contractNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      projectName: dto.projectName,
      startDate: dto.startDate,
      endDate: dto.endDate,
      contractValue: dto.contractValue,
      totalQuota: dto.totalQuota,
      usedQuota: 0,
      remainingQuota: dto.totalQuota,
      status: 'draft',
      attachments: [],
    } as any);

    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      customerName?: string;
      projectName?: string;
      startDate?: string;
      endDate?: string;
      contractValue?: number;
      totalQuota?: number;
      status?: string;
    },
  ): Promise<LabContract> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Contract not found');
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async approve(id: string, userId: string): Promise<LabContract> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Contract not found');
    }
    if (existing.status !== 'review') {
      throw new Error('Only review contracts can be approved');
    }
    existing.status = 'signed';
    existing.approvedBy = userId;
    existing.approvedAt = new Date();
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
