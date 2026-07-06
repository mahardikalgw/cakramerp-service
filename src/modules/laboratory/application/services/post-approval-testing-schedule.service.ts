import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PostApprovalTestingSchedule } from '../../domain/entities/post-approval-testing-schedule.entity';
import type { PostApprovalTestingScheduleRepositoryPort } from '../../domain/repositories/post-approval-testing-schedule-repository.port';
import { POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY } from '../../domain/repositories/post-approval-testing-schedule-repository.port';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { LabActivityLogService } from './lab-activity-log.service';
import { LabScheduleSample } from '../../domain/entities/lab-schedule-sample.entity';
import type { LabScheduleSampleRepositoryPort } from '../../domain/repositories/lab-schedule-sample-repository.port';
import { LAB_SCHEDULE_SAMPLE_REPOSITORY } from '../../domain/repositories/lab-schedule-sample-repository.port';
import { LAB_CONTRACT_SAMPLE_REPOSITORY } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import type { LabContractSampleRepositoryPort } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import { NotificationEventService } from './notification-event.service';

@Injectable()
export class PostApprovalTestingScheduleService {
  constructor(
    @Inject(POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY)
    private readonly repository: PostApprovalTestingScheduleRepositoryPort,
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
    @Inject(LAB_SCHEDULE_SAMPLE_REPOSITORY)
    private readonly scheduleSampleRepo: LabScheduleSampleRepositoryPort,
    @Inject(LAB_CONTRACT_SAMPLE_REPOSITORY)
    private readonly contractSampleRepo: LabContractSampleRepositoryPort,
    private readonly activityLog: LabActivityLogService,
    private readonly notificationEventService: NotificationEventService,
  ) {}

  async findAll(options?: {
    status?: string;
    contractId?: string;
    laboranId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.contractId) filters.contractId = options.contractId;
    if (options?.laboranId) filters.laboranId = options.laboranId;
    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<PostApprovalTestingSchedule | null> {
    const schedule = await this.repository.findById(id);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    return schedule;
  }

  async findByContractId(
    contractId: string,
  ): Promise<PostApprovalTestingSchedule[]> {
    return this.repository.findByContractId(contractId);
  }

  async findMySchedules(
    userId: string,
  ): Promise<PostApprovalTestingSchedule[]> {
    return this.repository.findByLaboranId(userId);
  }

  async getPendingQuota(contractId: string): Promise<number> {
    const all = await this.repository.findAll({
      filters: { contractId },
      limit: 10000,
    });
    return all.data
      .filter((s) => s.status !== 'cancelled' && s.status !== 'completed')
      .reduce((sum, s) => sum + (s.qtySamples ?? 0), 0);
  }

  async getPendingAllocationsBySample(
    contractId: string,
  ): Promise<Record<string, number>> {
    const all = await this.repository.findAll({
      filters: { contractId },
      limit: 10000,
    });
    const pendingScheduleIds = all.data
      .filter((s) => s.status !== 'cancelled' && s.status !== 'completed')
      .map((s) => s.id);

    if (pendingScheduleIds.length === 0) return {};

    const allSamples = await Promise.all(
      pendingScheduleIds.map((sid) =>
        this.scheduleSampleRepo.findByScheduleId(sid),
      ),
    );

    const result: Record<string, number> = {};
    for (const samples of allSamples) {
      for (const sample of samples) {
        result[sample.contractSampleId] =
          (result[sample.contractSampleId] || 0) + sample.allocatedQuantity;
      }
    }
    return result;
  }

  async createByCustomer(data: {
    contractId: string;
    userId: string;
    userName: string;
    scheduledDate: string;
    scheduledTime?: string;
    scheduledLocation?: string;
    notes?: string;
    sampleAllocations: Array<{
      contractSampleId: string;
      allocatedQuantity: number;
    }>;
  }): Promise<PostApprovalTestingSchedule> {
    const contract = await this.contractRepo.findById(data.contractId);
    if (!contract) throw new NotFoundException('Lab contract not found');

    const contractSamples = await this.contractSampleRepo.findByContractId(
      data.contractId,
    );
    const samplesById = new Map(contractSamples.map((s) => [s.id, s]));

    for (const alloc of data.sampleAllocations) {
      if (alloc.allocatedQuantity <= 0)
        throw new BadRequestException('Quantity must be > 0');
      if (!samplesById.has(alloc.contractSampleId)) {
        throw new BadRequestException(
          `Invalid contract sample: ${alloc.contractSampleId}`,
        );
      }
    }

    const total = data.sampleAllocations.reduce(
      (sum, a) => sum + a.allocatedQuantity,
      0,
    );
    if (total === 0)
      throw new BadRequestException('Must allocate at least 1 quota unit');
    if (!contract.isUnlimited) {
      const pendingAllocated = await this.getPendingQuota(data.contractId);
      const availableNow = (contract.remainingQuota ?? 0) - pendingAllocated;
      if (availableNow < total) {
        throw new BadRequestException(
          `Insufficient quota. Available: ${availableNow}, Already allocated in other schedules: ${pendingAllocated}, Requested: ${total}`,
        );
      }
    }

    const schedule = new PostApprovalTestingSchedule({
      contractId: data.contractId,
      createdBy: data.userId,
      createdByName: data.userName,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime || null,
      scheduledLocation: data.scheduledLocation || null,
      qtySamples: total,
      notes: data.notes || null,
      status: 'pending',
    });

    const saved = await this.repository.save(schedule);

    const scheduleSamples = data.sampleAllocations.map((alloc) => {
      const cs = samplesById.get(alloc.contractSampleId)!;
      return new LabScheduleSample({
        scheduleId: saved.id,
        contractSampleId: alloc.contractSampleId,
        serviceName: cs.serviceName,
        sampleCode: cs.sampleCode,
        allocatedQuantity: alloc.allocatedQuantity,
      });
    });
    await this.scheduleSampleRepo.saveMany(scheduleSamples);

    for (const cs of contractSamples) {
      if (data.sampleAllocations.some((a) => a.contractSampleId === cs.id)) {
        cs.status = 'in_progress';
        await this.contractSampleRepo.save(cs);
      }
    }

    void this.activityLog.log({
      testingRequestId: contract.testingRequestId,
      action: 'testing_schedule_created',
      performedBy: data.userId,
      performedByName: data.userName,
      performedByRole: 'customer',
      details: {
        scheduleId: saved.id,
        contractId: data.contractId,
        totalQuota: total,
      },
    });

    return saved;
  }

  async getScheduleWithSamples(scheduleId: string): Promise<{
    schedule: PostApprovalTestingSchedule;
    sampleAllocations: LabScheduleSample[];
  }> {
    const schedule = await this.repository.findById(scheduleId);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    const sampleAllocations =
      await this.scheduleSampleRepo.findByScheduleId(scheduleId);
    return { schedule, sampleAllocations };
  }

  async confirmByAdmin(
    scheduleId: string,
    adminUserId: string,
    adminUserName: string,
    data: { laboranId: string; laboranName: string; statusNotes?: string },
  ): Promise<PostApprovalTestingSchedule> {
    const schedule = await this.repository.findById(scheduleId);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    if (schedule.status !== 'pending')
      throw new BadRequestException('Only pending schedules can be confirmed');

    schedule.status = 'confirmed';
    schedule.laboranId = data.laboranId;
    schedule.laboranName = data.laboranName;
    schedule.confirmedBy = adminUserId;
    schedule.confirmedByName = adminUserName;
    schedule.confirmedAt = new Date();
    schedule.statusNotes = data.statusNotes || null;

    const saved = await this.repository.save(schedule);

    const contract = await this.contractRepo.findById(schedule.contractId);

    void this.activityLog.log({
      testingRequestId: contract?.testingRequestId ?? schedule.contractId,
      action: 'schedule_confirmed',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
      details: { scheduleId: saved.id, laboranId: data.laboranId },
    });

    void this.notificationEventService
      .onScheduleConfirmed(saved)
      .catch(() => {});

    return saved;
  }

  async findConflicts(
    laboranId: string,
    date: string,
    time?: string,
  ): Promise<{
    hasConflict: boolean;
    conflicts: Array<{
      id: string;
      scheduledDate: string;
      scheduledTime: string | null;
      scheduledLocation: string | null;
      qtySamples: number;
      status: string;
      contractId: string;
    }>;
  }> {
    if (!laboranId) return { hasConflict: false, conflicts: [] };

    const all = await this.repository.findAll({
      filters: { laboranId },
      limit: 10000,
    });

    const conflicts = all.data
      .filter(
        (s) =>
          s.scheduledDate === date &&
          (!time || !s.scheduledTime || s.scheduledTime === time) &&
          !['cancelled', 'completed'].includes(s.status),
      )
      .map((s) => ({
        id: s.id,
        scheduledDate: s.scheduledDate,
        scheduledTime: s.scheduledTime,
        scheduledLocation: s.scheduledLocation,
        qtySamples: s.qtySamples,
        status: s.status,
        contractId: s.contractId,
      }));

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  async cancelByCustomer(
    scheduleId: string,
    userId: string,
  ): Promise<PostApprovalTestingSchedule> {
    const schedule = await this.repository.findById(scheduleId);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    if (schedule.createdBy !== userId)
      throw new BadRequestException(
        'Only the creator can cancel this schedule',
      );
    if (schedule.status !== 'pending')
      throw new BadRequestException('Only pending schedules can be cancelled');

    schedule.status = 'cancelled';
    const saved = await this.repository.save(schedule);

    return saved;
  }

  async delete(id: string): Promise<boolean> {
    const schedule = await this.repository.findById(id);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    if (!['cancelled', 'pending'].includes(schedule.status)) {
      throw new BadRequestException(
        'Only pending or cancelled schedules can be deleted',
      );
    }
    return this.repository.delete(id);
  }
}
