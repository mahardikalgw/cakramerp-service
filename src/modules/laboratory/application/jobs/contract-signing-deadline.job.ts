import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';

@Injectable()
export class ContractSigningDeadlineJob {
  private readonly logger = new Logger(ContractSigningDeadlineJob.name);

  constructor(
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly testingRequestRepo: TestingRequestRepositoryPort,
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async cancelExpiredUnsignedContracts() {
    this.logger.log('[CRON] Checking for expired unsigned contracts...');
    try {
      const now = new Date();
      const expired = await this.testingRequestRepo.findExpiredUnsignedContracts(now);
      
      for (const request of expired) {
        request.status = 'cancelled';
        await this.testingRequestRepo.save(request);
        this.logger.log(`[CRON] Cancelled expired unsigned contract request ${request.id} (${request.requestNumber})`);

        if (request.labContractId) {
          try {
            const contract = await this.contractRepo.findById(request.labContractId);
            if (contract) {
              contract.status = 'cancelled';
              await this.contractRepo.save(contract);
              this.logger.log(`[CRON] Cancelled orphaned contract ${contract.id} (${contract.contractNumber})`);
            }
          } catch (err: any) {
            this.logger.error(`[CRON] Failed to cancel contract for request ${request.id}: ${err?.message}`);
          }
        }
      }

      if (expired.length === 0) {
        this.logger.log('[CRON] No expired unsigned contracts found');
      }
    } catch (err: any) {
      this.logger.error(`[CRON] Error checking expired unsigned contracts: ${err?.message}`, err?.stack);
    }
  }
}