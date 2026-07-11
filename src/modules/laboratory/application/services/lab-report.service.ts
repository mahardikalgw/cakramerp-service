import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DailyReport } from '../../domain/entities/daily-report.entity';
import type { DailyReportRepositoryPort } from '../../domain/repositories/daily-report-repository.port';
import { DAILY_REPORT_REPOSITORY } from '../../domain/repositories/daily-report-repository.port';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import {
  DOCUMENT_TYPES,
  OUTPUT_FORMATS,
} from '../../../shared/infrastructure/document-generation/document-generation.constants';
import { LabActivityLogService } from './lab-activity-log.service';

@Injectable()
export class LabReportService {
  constructor(
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly testingRequestRepo: TestingRequestRepositoryPort,
    @Inject(DAILY_REPORT_REPOSITORY)
    private readonly dailyReportRepo: DailyReportRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepo: TestResultRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly activityLog: LabActivityLogService,
  ) {}

  /**
   * Generate a draft lab report PDF from a testing request.
   * Aggregates all approved test results for the request's samples,
   * creates a DailyReport record, then triggers async document generation.
   */
  async generateDraftReport(
    testingRequestId: string,
    userId: string,
    userName?: string,
  ): Promise<DailyReport & { documentRequestId: string }> {
    const request = await this.testingRequestRepo.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');

    if (
      !['assigned', 'sampling', 'testing', 'report_draft'].includes(
        request.status,
      )
    ) {
      throw new BadRequestException(
        'Report can only be generated when request is in assigned, sampling, testing, or report_draft status',
      );
    }

    // Fetch all test results for this testing request
    // Use findByTestingRequestId for efficient lookup
    const allResults =
      await this.testResultRepo.findByTestingRequestId(testingRequestId);

    const approvedResults = allResults.filter(
      (r) => (r as any).status === 'approved',
    );

    // Build report lines from approved test results
    const lines = (approvedResults as any[]).map((result: any) => ({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      dailyReportId: undefined,
      testResultId: result.id,
      resultNumber: result.resultNumber,
      sampleCode: result.sampleCode,
      serviceName: result.serviceName,
      parameter: result.parameter ?? '',
      resultValue: result.resultValue ?? '',
    }));

    // generateNextReportNumber() atomically picks the next free
    // report_number under a PostgreSQL advisory lock and includes
    // soft-deleted rows in the MAX query, so the sequence never
    // collides with a soft-deleted record's UNIQUE constraint.
    const reportNumber = await this.dailyReportRepo.generateNextReportNumber();

    const dailyReport = new DailyReport({
      reportNumber,
      reportDate: new Date(),
      testingRequestId: request.id,
      testingRequestNumber: request.requestNumber,
      customerId: request.customerId,
      customerName: (request as any).customerName ?? '',
      status: 'draft',
      lines,
    } as any);

    const savedReport = await this.dailyReportRepo.save(dailyReport);

    // Update testing request status to report_draft
    if (request.status !== 'report_draft') {
      request.status = 'report_draft';
      await this.testingRequestRepo.save(request);
    }

    // Trigger async document generation (fire-and-forget)
    const docRequest = await this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.LAB_DRAFT_REPORT,
      entityId: savedReport.id,
      tenantId: 'default',
      requestedBy: userId,
      outputFormat: OUTPUT_FORMATS[0], // pdf
      watermark: 'DRAFT',
      parameters: {
        testingRequestId: request.id,
        testingRequestNumber: request.requestNumber,
        reportNumber: savedReport.reportNumber,
        customerId: request.customerId,
        priority: (request as any).priority ?? 'normal',
      },
    });

    // Log activity
    void this.activityLog.log({
      testingRequestId,
      action: 'report_generated',
      performedBy: userId,
      performedByName: userName,
      performedByRole: 'laboran',
      details: {
        reportId: savedReport.id,
        reportNumber: savedReport.reportNumber,
        documentRequestId: docRequest.id,
        resultCount: lines.length,
      },
    });

    return Object.assign(savedReport, { documentRequestId: docRequest.id });
  }

  /**
   * Finalize an approved report — generate the final PDF (no watermark),
   * update testing request to completed.
   */
  async finalizeDraftReport(
    reportId: string,
    userId: string,
    userName?: string,
  ): Promise<DailyReport & { documentRequestId: string }> {
    const report = await this.dailyReportRepo.findById(reportId);
    if (!report) throw new NotFoundException('Daily report not found');
    if (report.status !== 'approved') {
      throw new BadRequestException('Only approved reports can be finalized');
    }

    const docRequest = await this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.LAB_FINAL_REPORT,
      entityId: report.id,
      tenantId: 'default',
      requestedBy: userId,
      outputFormat: OUTPUT_FORMATS[0], // pdf
      parameters: {
        testingRequestId: report.testingRequestId,
        testingRequestNumber: report.testingRequestNumber,
        reportNumber: report.reportNumber,
        customerId: report.customerId,
        customerName: report.customerName,
      },
    });

    // Mark testing request as completed
    const testingRequest = await this.testingRequestRepo.findById(
      report.testingRequestId,
    );
    if (testingRequest) {
      testingRequest.status = 'completed';
      await this.testingRequestRepo.save(testingRequest);
    }

    void this.activityLog.log({
      testingRequestId: report.testingRequestId,
      action: 'completed',
      performedBy: userId,
      performedByName: userName,
      performedByRole: 'admin',
      details: { reportId, documentRequestId: docRequest.id },
    });

    return Object.assign(report, { documentRequestId: docRequest.id });
  }

  /** Get all documents (generated PDFs) for a daily report */
  async getReportDocuments(reportId: string) {
    const draftDocs = await this.docHelper.getDocumentsByEntity(
      DOCUMENT_TYPES.LAB_DRAFT_REPORT,
      reportId,
    );
    const finalDocs = await this.docHelper.getDocumentsByEntity(
      DOCUMENT_TYPES.LAB_FINAL_REPORT,
      reportId,
    );
    return [...draftDocs, ...finalDocs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Get presigned download URL for a generated document */
  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    return this.docHelper.getDownloadUrl(documentId);
  }

  // ---- private helpers ----

  private generateReportNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/RPT-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `RPT-${year}-${seq.toString().padStart(5, '0')}`;
  }
}
