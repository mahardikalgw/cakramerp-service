import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostApprovalTestingResult } from '../../domain/entities/post-approval-testing-result.entity';
import type { PostApprovalTestingResultRepositoryPort } from '../../domain/repositories/post-approval-testing-result-repository.port';
import { POST_APPROVAL_TESTING_RESULT_REPOSITORY } from '../../domain/repositories/post-approval-testing-result-repository.port';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import type { SampleQuotaRepositoryPort } from '../../domain/repositories/sample-quota-repository.port';
import { SAMPLE_QUOTA_REPOSITORY } from '../../domain/repositories/sample-quota-repository.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { MinioClientService } from '../../../shared/infrastructure/document-generation/minio-client.service';
import { TestResultAttachmentTypeOrmEntity } from '../../infrastructure/entities/test-result-attachment-typeorm.entity';
import { LabActivityLogService } from './lab-activity-log.service';
import { LAB_CONTRACT_SAMPLE_REPOSITORY } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import type { LabContractSampleRepositoryPort } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import { LAB_SCHEDULE_SAMPLE_REPOSITORY } from '../../domain/repositories/lab-schedule-sample-repository.port';
import type { LabScheduleSampleRepositoryPort } from '../../domain/repositories/lab-schedule-sample-repository.port';
import { POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY } from '../../domain/repositories/post-approval-testing-schedule-repository.port';
import type { PostApprovalTestingScheduleRepositoryPort } from '../../domain/repositories/post-approval-testing-schedule-repository.port';
import { NotificationEventService } from './notification-event.service';
import { ContractTestInvoiceService } from './contract-test-invoice.service';

@Injectable()
export class PostApprovalTestingResultService {
  private readonly logger = new Logger(PostApprovalTestingResultService.name);

  constructor(
    @Inject(POST_APPROVAL_TESTING_RESULT_REPOSITORY)
    private readonly repository: PostApprovalTestingResultRepositoryPort,
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
    @Inject(LAB_CONTRACT_SAMPLE_REPOSITORY)
    private readonly contractSampleRepo: LabContractSampleRepositoryPort,
    @Inject(LAB_SCHEDULE_SAMPLE_REPOSITORY)
    private readonly scheduleSampleRepo: LabScheduleSampleRepositoryPort,
    @Inject(POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY)
    private readonly scheduleRepo: PostApprovalTestingScheduleRepositoryPort,
    @Inject(SAMPLE_QUOTA_REPOSITORY)
    private readonly sampleQuotaRepo: SampleQuotaRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly minioClient: MinioClientService,
    @InjectRepository(TestResultAttachmentTypeOrmEntity)
    private readonly attachmentRepo: Repository<TestResultAttachmentTypeOrmEntity>,
    private readonly activityLog: LabActivityLogService,
    private readonly notificationEventService: NotificationEventService,
    private readonly contractTestInvoiceService: ContractTestInvoiceService,
  ) {}

  async findAll(options?: {
    status?: string;
    contractId?: string;
    scheduleId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.contractId) filters.contractId = options.contractId;
    if (options?.scheduleId) filters.scheduleId = options.scheduleId;
    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<PostApprovalTestingResult | null> {
    const result = await this.repository.findById(id);
    if (!result) throw new NotFoundException('Testing result not found');
    return result;
  }

  async findByIdEnriched(id: string): Promise<Record<string, any>> {
    const result = await this.repository.findById(id);
    if (!result) throw new NotFoundException('Testing result not found');

    let contractNumber = '';
    let customerName = '';
    let projectName = '';
    let projectLocation = '';
    let testingType = '';
    let sampleCode = '';
    let serviceName = '';
    let scheduleDate = '';
    let scheduleTime = '';
    let scheduledLocation = '';
    let laboranName = '';
    if (result.contractId) {
      try {
        const contract = await this.contractRepo.findById(result.contractId);
        if (contract) {
          contractNumber = contract.contractNumber ?? '';
          customerName = contract.customerName ?? '';
          projectName = contract.projectName ?? '';
          projectLocation = contract.projectLocation ?? '';
          testingType = contract.testingType ?? '';
        }
      } catch {
        /* ignore */
      }
    }

    if (result.scheduleSampleId) {
      try {
        const ss = await this.scheduleSampleRepo.findById(
          result.scheduleSampleId,
        );
        if (ss) {
          sampleCode = ss.sampleCode ?? '';
          serviceName = ss.serviceName ?? '';
          if (result.scheduleId) {
            const schedule = await this.scheduleRepo.findById(
              result.scheduleId,
            );
            if (schedule) {
              scheduleDate = schedule.scheduledDate ?? '';
              scheduleTime = schedule.scheduledTime ?? '';
              scheduledLocation = schedule.scheduledLocation ?? '';
              laboranName = schedule.laboranName ?? '';
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (!sampleCode && result.sampleId) {
      try {
        const cs = await this.contractSampleRepo.findById(result.sampleId);
        if (cs) {
          sampleCode = cs.sampleCode ?? '';
          if (!serviceName) serviceName = cs.serviceName ?? '';
        }
      } catch {
        /* ignore */
      }
    }

    if (!serviceName && result.serviceName) {
      serviceName = result.serviceName;
    }

    const {
      sampleUnit: _sampleUnit,
      scheduleSampleId: _scheduleSampleId,
      ...resultWithoutInternals
    } = result as any;

    return {
      ...resultWithoutInternals,
      contractNumber,
      customerName,
      projectName,
      projectLocation,
      testingType,
      sampleCode,
      serviceName,
      scheduleDate,
      scheduleTime,
      scheduledLocation,
      laboranName,
    };
  }

  async generateCertificate(
    id: string,
    userId: string,
    userName: string,
  ): Promise<Record<string, any>> {
    const enriched = await this.findByIdEnriched(id);

    const parameters = (enriched.resultData as any)?.parameters ?? [];

    const lines = parameters.map((p: any) => ({
      name: p.parameter ?? '',
      value: p.value ?? '',
      unit: p.unit ?? '',
      method: p.standard ?? '',
      sop: p.standard ?? '',
    }));

    const certificateNumber = `SR-${enriched.resultNumber ?? id.substring(0, 8)}`;

    const doc = await this.docHelper.generateDocument({
      documentType: 'test_result_certificate',
      entityId: id,
      requestedBy: userId,
      outputFormat: 'pdf',
      parameters: {
        certificateNumber,
        sampleCode: enriched.sampleCode || enriched.sampleId || '-',
        customerName: enriched.customerName || '-',
        projectName: enriched.projectName || '-',
        testingServiceName: enriched.serviceName || '-',
        submittedAt: enriched.submittedAt
          ? typeof enriched.submittedAt === 'string'
            ? enriched.submittedAt.split('T')[0]
            : new Date(enriched.submittedAt).toISOString().split('T')[0]
          : '-',
        submittedByName: enriched.submittedByName || '-',
        laboranName: enriched.laboranName || enriched.submittedByName || '-',
        customerSignatureName: enriched.customerName || '-',
        labSignatureName: enriched.laboranName || '-',
        certificateDate: new Date().toISOString().split('T')[0],
        resultNotes: enriched.resultNotes || '',
        resultNumber: enriched.resultNumber || '',
        sampleUnit: String(enriched.sampleUnit ?? ''),
        contractNumber: enriched.contractNumber || '',
      },
      lines,
    });

    const saved = await this.repository.findById(id);
    if (saved) {
      saved.certificateDocumentId = doc.id;
      await this.repository.save(saved);
    }

    this.logger.log(`Certificate generated for result ${id}: ${doc.id}`);

    return { documentId: doc.id };
  }

  async uploadSignedCertificate(
    testResultId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    userId: string,
    userName: string,
  ): Promise<TestResultAttachmentTypeOrmEntity> {
    const result = await this.repository.findById(testResultId);
    if (!result) throw new NotFoundException('Testing result not found');

    const timestamp = Date.now();
    const objectName = `signed-certificates/${testResultId}/${timestamp}_${file.originalname}`;
    const fileUrl = await this.minioClient.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );

    const attachment = this.attachmentRepo.create({
      testResultId,
      fileName: file.originalname,
      fileUrl,
      fileType: 'signed_certificate',
    } as any);
    const saved = (await this.attachmentRepo.save(
      attachment,
    )) as unknown as TestResultAttachmentTypeOrmEntity;

    this.logger.log(
      `Signed certificate uploaded for result ${testResultId}: ${objectName}`,
    );
    return saved;
  }

  async getSignedCertificate(
    testResultId: string,
  ): Promise<{ url: string; fileName: string } | null> {
    const attachments = await this.attachmentRepo.find({
      where: { testResultId, fileType: 'signed_certificate' } as any,
      order: { createdAt: 'DESC' } as any,
      take: 1,
    });
    if (attachments.length === 0) return null;

    const attachment = attachments[0];
    const bucket = 'documents';
    const objectName = attachment.fileUrl.replace(`${bucket}/`, '');
    const url = await this.minioClient.getPresignedUrl(bucket, objectName);
    if (!url) return null;

    return { url, fileName: attachment.fileName };
  }

  async findByContractId(
    contractId: string,
  ): Promise<PostApprovalTestingResult[]> {
    return this.repository.findByContractId(contractId);
  }

  async findByScheduleId(
    scheduleId: string,
  ): Promise<PostApprovalTestingResult[]> {
    return this.repository.findByScheduleId(scheduleId);
  }

  async findByUnit(
    scheduleSampleId: string,
    sampleUnit: number,
  ): Promise<PostApprovalTestingResult | null> {
    return this.repository.findByScheduleSampleUnit(
      scheduleSampleId,
      sampleUnit,
    );
  }

  async createOrUpdate(data: {
    scheduleId: string;
    scheduleSampleId: string;
    sampleUnit: number;
    contractId: string;
    userId: string;
    userName: string;
    resultData: Record<string, unknown>;
    resultNotes?: string;
  }): Promise<PostApprovalTestingResult> {
    const ss = await this.scheduleSampleRepo.findById(data.scheduleSampleId);
    if (!ss) throw new NotFoundException('Schedule sample not found');
    if (data.sampleUnit < 1 || data.sampleUnit > ss.allocatedQuantity) {
      throw new BadRequestException(
        `sample_unit must be 1..${ss.allocatedQuantity}, got ${data.sampleUnit}`,
      );
    }

    const existing = await this.repository.findByScheduleSampleUnit(
      data.scheduleSampleId,
      data.sampleUnit,
    );

    if (existing) {
      if (existing.status !== 'draft')
        throw new BadRequestException('Only draft results can be updated');
      existing.resultData = data.resultData;
      existing.resultNotes = data.resultNotes || null;
      return this.repository.save(existing);
    }

    let testingServiceId: string | null = null;
    let contractId = data.contractId;
    try {
      const cs = await this.contractSampleRepo.findById(ss.contractSampleId);
      if (cs) testingServiceId = cs.testingServiceId;
    } catch {
      /* ignore */
    }
    try {
      const schedule = await this.scheduleRepo.findById(data.scheduleId);
      if (schedule?.contractId) contractId = schedule.contractId;
    } catch {
      /* ignore */
    }

    const result = new PostApprovalTestingResult({
      resultNumber: `PTR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      sampleId: ss.contractSampleId,
      sampleCode: ss.sampleCode,
      testingServiceId,
      serviceName: ss.serviceName,
      parameter: '-',
      resultValue: '-',
      contractId,
      scheduleId: data.scheduleId,
      scheduleSampleId: data.scheduleSampleId,
      sampleUnit: data.sampleUnit,
      submittedBy: data.userId,
      submittedByName: data.userName,
      submittedAt: new Date(),
      resultData: data.resultData,
      resultNotes: data.resultNotes || null,
      status: 'draft',
    });

    return this.repository.save(result);
  }

  async submit(
    id: string,
    userId: string,
    userName: string,
  ): Promise<PostApprovalTestingResult> {
    const result = await this.repository.findById(id);
    if (!result) throw new NotFoundException('Testing result not found');
    if (result.status !== 'draft')
      throw new BadRequestException('Only draft results can be submitted');

    result.status = 'submitted';
    result.submittedAt = new Date();
    const saved = await this.repository.save(result);

    if (saved.scheduleSampleId) {
      try {
        const ss = await this.scheduleSampleRepo.findById(
          saved.scheduleSampleId,
        );
        if (ss && ss.usedQuantity < ss.allocatedQuantity) {
          ss.usedQuantity += 1;
          await this.scheduleSampleRepo.save(ss);
        }
      } catch {
        /* ignore */
      }
    }

    let testingRequestId = saved.contractId;
    try {
      const contract = await this.contractRepo.findById(saved.contractId);
      if (contract?.testingRequestId)
        testingRequestId = contract.testingRequestId;
    } catch {
      /* ignore */
    }

    void this.activityLog.log({
      testingRequestId,
      action: 'testing_result_submitted',
      performedBy: userId,
      performedByName: userName,
      performedByRole: 'laboran',
      details: {
        resultId: saved.id,
        sampleId: saved.sampleId,
        sampleUnit: saved.sampleUnit,
      },
    });

    let schedule: any = null;
    try {
      if (saved.scheduleId) {
        schedule = await this.scheduleRepo.findById(saved.scheduleId);
      }
    } catch {
      /* ignore */
    }
    void this.notificationEventService
      .onTestResultSubmitted(saved, schedule)
      .catch(() => {});

    return saved;
  }

  async confirmByCustomer(
    id: string,
    userId: string,
    userName: string,
  ): Promise<PostApprovalTestingResult> {
    const result = await this.repository.findById(id);
    if (!result) throw new NotFoundException('Testing result not found');
    if (result.status !== 'submitted')
      throw new BadRequestException('Only submitted results can be confirmed');

    result.status = 'confirmed';
    result.confirmedBy = userId;
    result.confirmedByName = userName;
    result.confirmedAt = new Date();
    const saved = await this.repository.save(result);

    if (saved.sampleId) {
      try {
        const cs = await this.contractSampleRepo.findById(saved.sampleId);
        if (cs) {
          cs.completedQuantity = (cs.completedQuantity ?? 0) + 1;
          if (cs.completedQuantity >= (cs.sampleQuantity ?? 1)) {
            cs.status = 'completed';
          }
          await this.contractSampleRepo.save(cs);
        }
      } catch {
        /* ignore */
      }
    }

    if (saved.scheduleSampleId) {
      try {
        const ss = await this.scheduleSampleRepo.findById(
          saved.scheduleSampleId,
        );
        if (ss) {
          ss.completedQuantity += 1;
          await this.scheduleSampleRepo.save(ss);

          const allSamples = await this.scheduleSampleRepo.findByScheduleId(
            saved.scheduleId!,
          );
          const allCompleted = allSamples.every(
            (s) => s.completedQuantity >= s.allocatedQuantity,
          );
          if (allCompleted) {
            try {
              const schedule = await this.scheduleRepo.findById(
                saved.scheduleId!,
              );
              if (schedule) {
                schedule.status = 'completed';
                await this.scheduleRepo.save(schedule);
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    const contract = await this.contractRepo
      .findById(saved.contractId)
      .catch(() => null);
    if (contract) {
      // Unlimited contracts have no meaningful per-result quota and must stay
      // 'active' so customers can keep submitting testing requests under them.
      // They are only transitioned to 'closed' when an admin explicitly closes
      // them. Limited contracts keep the original behaviour: track quota, and
      // auto-complete when every sample's quota has been consumed.
      if (contract.isUnlimited) {
        // no-op
      } else {
        contract.usedQuota = (contract.usedQuota ?? 0) + 1;
        contract.remainingQuota = Math.max(
          0,
          (contract.totalQuota ?? 0) - contract.usedQuota,
        );
        await this.contractRepo.save(contract);

        try {
          const allContractSamples =
            await this.contractSampleRepo.findByContractId(saved.contractId);
          if (allContractSamples.length > 0) {
            const allDone = allContractSamples.every(
              (s) => (s.completedQuantity ?? 0) >= (s.sampleQuantity ?? 1),
            );
            if (allDone && contract.status !== 'completed') {
              contract.status = 'completed';
              await this.contractRepo.save(contract);
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (contract?.testingRequestId) {
      let tsi = saved.testingServiceId;
      if (!tsi && saved.sampleId) {
        try {
          const cs = await this.contractSampleRepo.findById(saved.sampleId);
          tsi = cs?.testingServiceId ?? null;
        } catch (err: any) {
          this.logger.warn(
            `[CONFIRM] Failed to look up testingServiceId from contract sample ${saved.sampleId}: ${err?.message}`,
          );
        }
      }

      try {
        const quotas = await this.sampleQuotaRepo.findByTestingRequestId(
          contract.testingRequestId,
        );
        const matchingQuota = quotas.find((q) => q.testingServiceId === tsi);
        if (matchingQuota) {
          matchingQuota.usedQuota = (matchingQuota.usedQuota ?? 0) + 1;
          matchingQuota.remainingQuota = Math.max(
            0,
            (matchingQuota.totalQuota ?? 0) - matchingQuota.usedQuota,
          );
          await this.sampleQuotaRepo.save(matchingQuota);
          this.logger.log(
            `[CONFIRM] Sample quota reduced: service=${tsi}, request=${contract.testingRequestId}, ` +
              `used=${matchingQuota.usedQuota}/${matchingQuota.totalQuota}`,
          );
        } else if (tsi) {
          this.logger.warn(
            `[CONFIRM] No matching sample_quotas row found for service=${tsi} on request=${contract.testingRequestId}`,
          );
        } else {
          this.logger.warn(
            `[CONFIRM] Cannot reduce sample quota: testingServiceId is null for result=${saved.id}`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `[CONFIRM] Failed to reduce sample quota: ${err?.message}`,
        );
      }
    }

    try {
      const enriched = await this.findByIdEnriched(saved.id);
      const parameters = (enriched.resultData as any)?.parameters ?? [];
      const certLines = parameters.map((p: any) => ({
        name: p.parameter ?? '',
        value: p.value ?? '',
        unit: p.unit ?? '',
        method: p.standard ?? '',
        sop: p.standard ?? '',
      }));
      const certificateDoc = await this.docHelper.generateDocument({
        documentType: 'test_result_certificate',
        entityId: saved.id,
        requestedBy: userId,
        outputFormat: 'pdf',
        parameters: {
          certificateNumber: `TR-${saved.id.substring(0, 8)}`,
          sampleCode: enriched.sampleCode || saved.sampleId || '-',
          customerName: enriched.customerName || '-',
          projectName: enriched.projectName || '-',
          testingServiceName: enriched.serviceName || '-',
          submittedAt: saved.submittedAt
            ? typeof saved.submittedAt === 'string'
              ? (saved.submittedAt as string).split('T')[0]
              : new Date(saved.submittedAt).toISOString().split('T')[0]
            : '-',
          submittedByName: saved.submittedByName || '-',
          laboranName: enriched.laboranName || saved.submittedByName || '-',
          customerSignatureName: enriched.customerName || '-',
          labSignatureName:
            enriched.laboranName || saved.submittedByName || '-',
          certificateDate: new Date().toISOString().split('T')[0],
          resultNotes: enriched.resultNotes || '',
          resultNumber: enriched.resultNumber || '',
          contractNumber: enriched.contractNumber || '',
        },
        lines: certLines,
      });

      saved.certificateDocumentId = certificateDoc.id;
      await this.repository.save(saved);

      this.logger.log(`Result certificate generated: ${certificateDoc.id}`);
    } catch (err: any) {
      this.logger.warn(`Certificate generation failed: ${err?.message}`);
    }

    const confirmedContract = await this.contractRepo
      .findById(saved.contractId)
      .catch(() => null);
    void this.activityLog.log({
      testingRequestId: confirmedContract?.testingRequestId ?? saved.contractId,
      action: 'testing_result_confirmed',
      performedBy: userId,
      performedByName: userName,
      performedByRole: 'customer',
      details: { resultId: saved.id },
    });

    void this.notificationEventService
      .onTestResultConfirmed(saved)
      .catch(() => {});

    if (saved.scheduleId) {
      try {
        const scheduleCheck = await this.scheduleRepo.findById(
          saved.scheduleId,
        );
        if (
          scheduleCheck &&
          scheduleCheck.status === 'completed' &&
          confirmedContract
        ) {
          void this.notificationEventService
            .onScheduleCompleted(scheduleCheck, confirmedContract)
            .catch(() => {});

          if (confirmedContract.billingType === 'contract') {
            void this.contractTestInvoiceService
              .generateForSchedule(
                saved.contractId,
                saved.scheduleId,
                userId,
                userName,
                'customer',
              )
              .then((invoice) => {
                if (invoice) {
                  void this.notificationEventService
                    .onContractTestInvoiceIssued(invoice, confirmedContract)
                    .catch(() => {});
                  this.logger.log(
                    `Auto-generated invoice ${invoice.invoiceNumber} for completed schedule ${saved.scheduleId}`,
                  );
                }
              })
              .catch((err) =>
                this.logger.error(
                  `Auto-invoice generation failed for schedule ${saved.scheduleId}: ${err?.message}`,
                ),
              );
          }
        }
      } catch {
        /* ignore */
      }
    }

    return saved;
  }

  async reject(
    id: string,
    reason: string,
    userId: string,
    userName: string,
  ): Promise<PostApprovalTestingResult> {
    const result = await this.repository.findById(id);
    if (!result) throw new NotFoundException('Testing result not found');
    if (result.status !== 'submitted')
      throw new BadRequestException('Only submitted results can be rejected');

    result.status = 'rejected';
    result.rejectionReason = reason;
    const saved = await this.repository.save(result);
    return saved;
  }
}
