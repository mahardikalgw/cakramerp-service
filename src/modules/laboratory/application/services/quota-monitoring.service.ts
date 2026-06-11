import { Injectable, Inject } from '@nestjs/common';
import type { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/lab-contract-repository.port';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';

@Injectable()
export class QuotaMonitoringService {
  constructor(
    @Inject(LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: LabContractRepositoryPort,
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly testingRequestRepo: TestingRequestRepositoryPort,
  ) {}

  async deductQuota(contractId: string, amount: number): Promise<any> {
    const contract = await this.contractRepo.findById(contractId);
    if (!contract) throw new Error('Contract not found');
    if (contract.status !== 'active')
      throw new Error('Only active contracts can have quota deducted');

    contract.usedQuota += amount;
    contract.remainingQuota = (contract.totalQuota ?? 0) - contract.usedQuota;
    if (contract.remainingQuota < 0) contract.remainingQuota = 0;

    return this.contractRepo.save(contract);
  }

  async getQuotaDashboard(customerId?: string): Promise<any> {
    const filters: Record<string, any> = {};
    if (customerId) filters.customerId = customerId;
    filters.status = 'active';

    const result = await this.contractRepo.findAll({ filters });
    const contracts = result.data;

    return contracts.map((c) => ({
      contractId: c.id,
      contractNumber: c.contractNumber,
      customerName: c.customerName,
      totalQuota: c.totalQuota ?? 0,
      usedQuota: c.usedQuota ?? 0,
      remainingQuota: c.remainingQuota ?? 0,
      utilizationRate: c.totalQuota
        ? ((c.usedQuota ?? 0) / c.totalQuota) * 100
        : 0,
      endDate: c.endDate,
      status: c.status,
    }));
  }

  async checkQuotaAvailability(
    contractId: string,
    requestedAmount: number,
  ): Promise<{ available: boolean; remaining: number }> {
    const contract = await this.contractRepo.findById(contractId);
    if (!contract) throw new Error('Contract not found');

    const remaining = contract.remainingQuota ?? 0;
    return { available: remaining >= requestedAmount, remaining };
  }
}
