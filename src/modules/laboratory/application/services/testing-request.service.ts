import { Injectable, Inject } from '@nestjs/common';
import { TestingRequest } from '../../domain/entities/testing-request.entity';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';

@Injectable()
export class TestingRequestService {
  constructor(
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly repository: TestingRequestRepositoryPort,
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

  async findById(id: string): Promise<TestingRequest | null> {
    return this.repository.findById(id);
  }

  async findByRequestNumber(
    requestNumber: string,
  ): Promise<TestingRequest | null> {
    return this.repository.findByRequestNumber(requestNumber);
  }

  async getLastRequestNumber(): Promise<string | null> {
    return this.repository.getLastRequestNumber();
  }

  private generateRequestNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/REQ-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `REQ-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async create(dto: {
    customerId: string;
    projectName: string;
    projectLocation?: string;
    testingType?: string;
    sampleQuantity?: number;
    scheduleDate?: string;
    notes?: string;
    lines: {
      testingServiceId?: string;
      serviceName: string;
      sampleQuantity?: number;
      notes?: string;
    }[];
  }): Promise<TestingRequest> {
    const lastNumber = await this.getLastRequestNumber();
    const requestNumber = this.generateRequestNumber(lastNumber);

    const entity = new TestingRequest({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      requestNumber,
      customerId: dto.customerId,
      projectName: dto.projectName,
      projectLocation: dto.projectLocation,
      testingType: dto.testingType,
      sampleQuantity: dto.sampleQuantity,
      scheduleDate: dto.scheduleDate,
      notes: dto.notes,
      status: 'draft',
      lines: dto.lines.map((line) => ({
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        testingRequestId: undefined,
        testingServiceId: line.testingServiceId,
        serviceName: line.serviceName,
        sampleQuantity: line.sampleQuantity,
        notes: line.notes,
      })),
    } as any);

    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      customerId?: string;
      projectName?: string;
      projectLocation?: string;
      testingType?: string;
      sampleQuantity?: number;
      scheduleDate?: string;
      notes?: string;
      lines?: {
        testingServiceId?: string;
        serviceName: string;
        sampleQuantity?: number;
        notes?: string;
      }[];
    },
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing request not found');
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async submit(id: string): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing request not found');
    }
    if (existing.status !== 'draft') {
      throw new Error('Only draft requests can be submitted');
    }
    existing.status = 'submitted';
    return this.repository.save(existing);
  }

  async approve(id: string, userId: string): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing request not found');
    }
    if (existing.status !== 'submitted') {
      throw new Error('Only submitted requests can be approved');
    }
    existing.status = 'approved';
    existing.approvedBy = userId;
    existing.approvedAt = new Date();
    return this.repository.save(existing);
  }

  async reject(
    id: string,
    userId: string,
    rejectionReason?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing request not found');
    }
    existing.status = 'rejected';
    existing.rejectionReason = rejectionReason;
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
