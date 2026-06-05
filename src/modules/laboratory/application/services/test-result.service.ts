import { Injectable, Inject } from '@nestjs/common';
import { TestResult } from '../../domain/entities/test-result.entity';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';

@Injectable()
export class TestResultService {
  constructor(
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly repository: TestResultRepositoryPort,
  ) {}

  async findAll(options?: {
    status?: string;
    sampleId?: string;
    testingRequestId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.sampleId) filters.sampleId = options.sampleId;
    if (options?.testingRequestId)
      filters.testingRequestId = options.testingRequestId;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<TestResult | null> {
    return this.repository.findById(id);
  }

  async findBySampleId(sampleId: string): Promise<TestResult[]> {
    return this.repository.findBySampleId(sampleId);
  }

  private generateResultNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/RES-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `RES-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async create(dto: {
    sampleId: string;
    sampleCode: string;
    testingServiceId: string;
    serviceName: string;
    testingRequestId?: string;
    parameter: string;
    resultValue: string;
    unit?: string;
    laboratoryNotes?: string;
    testedById?: string;
    testedByName?: string;
    attachments?: { fileName: string; fileUrl: string; fileType?: string }[];
  }): Promise<TestResult> {
    const lastNumber = await this.repository.getLastResultNumber();
    const resultNumber = this.generateResultNumber(lastNumber);

    const entity = new TestResult({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      resultNumber,
      sampleId: dto.sampleId,
      sampleCode: dto.sampleCode,
      testingServiceId: dto.testingServiceId,
      serviceName: dto.serviceName,
      testingRequestId: dto.testingRequestId,
      parameter: dto.parameter,
      resultValue: dto.resultValue,
      unit: dto.unit,
      laboratoryNotes: dto.laboratoryNotes,
      testedById: dto.testedById,
      testedByName: dto.testedByName,
      testedAt: new Date(),
      status: 'draft',
      attachments:
        dto.attachments?.map((a) => ({
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          testResultId: undefined,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileType: a.fileType,
        })) ?? [],
    } as any);

    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      parameter?: string;
      resultValue?: string;
      unit?: string;
      laboratoryNotes?: string;
    },
  ): Promise<TestResult> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Test result not found');

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async submit(id: string): Promise<TestResult> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Test result not found');
    if (existing.status !== 'draft')
      throw new Error('Only draft results can be submitted');

    existing.status = 'submitted';
    return this.repository.save(existing);
  }

  async approve(id: string, userId: string): Promise<TestResult> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Test result not found');
    if (existing.status !== 'submitted')
      throw new Error('Only submitted results can be approved');

    existing.status = 'approved';
    existing.approvedById = userId;
    existing.approvedAt = new Date();
    return this.repository.save(existing);
  }

  async requestRevision(id: string, reason: string): Promise<TestResult> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Test result not found');

    existing.status = 'revision_requested';
    existing.laboratoryNotes = reason;
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
