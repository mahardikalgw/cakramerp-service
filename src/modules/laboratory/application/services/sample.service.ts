import { Injectable, Inject } from '@nestjs/common';
import { Sample } from '../../domain/entities/sample.entity';
import type { SampleRepositoryPort } from '../../domain/repositories/sample-repository.port';
import { SAMPLE_REPOSITORY } from '../../domain/repositories/sample-repository.port';

@Injectable()
export class SampleService {
  constructor(
    @Inject(SAMPLE_REPOSITORY)
    private readonly repository: SampleRepositoryPort,
  ) {}

  async findAll(options?: {
    status?: string;
    customerId?: string;
    testingRequestId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.customerId) filters.customerId = options.customerId;
    if (options?.testingRequestId)
      filters.testingRequestId = options.testingRequestId;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<Sample | null> {
    return this.repository.findById(id);
  }

  async findBySampleCode(sampleCode: string): Promise<Sample | null> {
    return this.repository.findBySampleCode(sampleCode);
  }

  private generateSampleCode(lastCode: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastCode) {
      const match = lastCode.match(/SPL-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `SPL-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async create(dto: {
    sampleTypeId: string;
    sampleTypeName: string;
    testingRequestId?: string;
    testingRequestNumber?: string;
    customerId: string;
    customerName: string;
    weight?: number;
    quantity?: number;
    location?: string;
    description?: string;
    notes?: string;
  }): Promise<Sample> {
    const lastCode = await this.repository.getLastSampleCode();
    const sampleCode = this.generateSampleCode(lastCode);

    const entity = new Sample({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      sampleCode,
      sampleTypeId: dto.sampleTypeId,
      sampleTypeName: dto.sampleTypeName,
      testingRequestId: dto.testingRequestId,
      testingRequestNumber: dto.testingRequestNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      weight: dto.weight,
      quantity: dto.quantity,
      location: dto.location,
      description: dto.description,
      notes: dto.notes,
      status: 'awaiting_delivery',
    } as any);

    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      weight?: number;
      quantity?: number;
      location?: string;
      description?: string;
      notes?: string;
    },
  ): Promise<Sample> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Sample not found');

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async receive(id: string, userId: string): Promise<Sample> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Sample not found');
    if (existing.status !== 'awaiting_delivery')
      throw new Error('Sample cannot be received in current status');

    existing.status = 'received';
    existing.receivedAt = new Date();
    existing.receivedBy = userId;
    return this.repository.save(existing);
  }

  async startProcessing(id: string): Promise<Sample> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Sample not found');
    if (existing.status !== 'received')
      throw new Error('Sample must be received before processing');

    existing.status = 'processing';
    return this.repository.save(existing);
  }

  async complete(id: string): Promise<Sample> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Sample not found');

    existing.status = 'completed';
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
