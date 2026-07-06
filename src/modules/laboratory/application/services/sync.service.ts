import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class SyncService {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async getChangesSince(
    since: string | undefined,
  ): Promise<SyncChangesResponse> {
    const sinceDate = since ? new Date(since) : new Date(0);

    const [
      testingRequests,
      labContracts,
      contractTestInvoices,
      laboratories,
      sampleTypes,
      testingServices,
      samples,
      schedules,
      postApprovalTestResults,
      certificates,
      dailyReports,
      distributions,
      testResults,
      purchaseOrders,
      archives,
      contractInvoices,
    ] = await Promise.all([
      this.findUpdatedSince('testing_request', sinceDate),
      this.findUpdatedSince('lab_contract', sinceDate),
      this.findUpdatedSince('contract_test_invoice', sinceDate),
      this.findUpdatedSince('laboratory', sinceDate),
      this.findUpdatedSince('sample_type', sinceDate),
      this.findUpdatedSince('testing_service', sinceDate),
      this.findUpdatedSince('sample', sinceDate),
      this.findUpdatedSince('testing_schedule', sinceDate),
      this.findUpdatedSince('post_approval_testing_result', sinceDate),
      this.findUpdatedSince('lab_certificate', sinceDate),
      this.findUpdatedSince('daily_report', sinceDate),
      this.findUpdatedSince('report_distribution', sinceDate),
      this.findUpdatedSince('test_result', sinceDate),
      this.findUpdatedSince('lab_purchase_order', sinceDate),
      this.findUpdatedSince('post_approval_document_archive', sinceDate),
      this.findUpdatedSince('contract_invoice', sinceDate),
    ]);

    return {
      testingRequests,
      labContracts,
      contractTestInvoices,
      laboratories,
      sampleTypes,
      testingServices,
      samples,
      schedules,
      postApprovalTestResults,
      certificates,
      dailyReports,
      distributions,
      testResults,
      purchaseOrders,
      archives,
      contractInvoices,
    };
  }

  private async findUpdatedSince(
    tableName: string,
    since: Date,
  ): Promise<any[]> {
    try {
      const rows = await this.entityManager.query(
        `SELECT * FROM "${tableName}" WHERE "updated_at" > $1 OR "updated_at" IS NULL ORDER BY "updated_at" ASC LIMIT 1000`,
        [since.toISOString()],
      );
      return rows ?? [];
    } catch {
      return [];
    }
  }

  async processBulkOperations(
    operations: SyncOperation[],
  ): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = [];

    for (const op of operations) {
      try {
        const tableName = this.getTableName(op.entityType);
        if (!tableName) {
          results.push({
            entityId: op.entityId,
            success: false,
            error: 'Unknown entity type',
          });
          continue;
        }

        await this.entityManager.query(
          `SELECT * FROM "${tableName}" WHERE "id" = $1`,
          [op.entityId],
        );
        results.push({ entityId: op.entityId, success: true });
      } catch (error: any) {
        results.push({
          entityId: op.entityId,
          success: false,
          error: error?.message ?? 'Unknown error',
        });
      }
    }

    return results;
  }

  private getTableName(entityType: string): string | null {
    const tableMap: Record<string, string> = {
      testing_request: 'testing_request',
      lab_contract: 'lab_contract',
      contract_test_invoice: 'contract_test_invoice',
      laboratory: 'laboratory',
      sample_type: 'sample_type',
      testing_service: 'testing_service',
      sample: 'sample',
      schedule: 'testing_schedule',
      post_approval_test_result: 'post_approval_testing_result',
      certificate: 'lab_certificate',
      daily_report: 'daily_report',
      distribution: 'report_distribution',
      test_result: 'test_result',
      contract_invoice: 'contract_invoice',
    };
    return tableMap[entityType] ?? null;
  }
}

export interface SyncOperation {
  entityType: string;
  entityId: string;
  operation: string;
  payload: any;
  expectedVersion?: string;
}

export interface SyncOperationResult {
  entityId: string;
  success: boolean;
  error?: string;
  newVersion?: string;
  conflict?: { serverVersion: any };
}

export interface SyncChangesResponse {
  testingRequests: any[];
  labContracts: any[];
  contractTestInvoices: any[];
  laboratories: any[];
  sampleTypes: any[];
  testingServices: any[];
  samples: any[];
  schedules: any[];
  postApprovalTestResults: any[];
  certificates: any[];
  dailyReports: any[];
  distributions: any[];
  testResults: any[];
  purchaseOrders: any[];
  archives: any[];
  contractInvoices: any[];
}
