import { Injectable, Inject } from '@nestjs/common';
import { TestingService } from '../../domain/entities/testing-service.entity';
import type { TestingServiceRepositoryPort } from '../../domain/repositories/testing-service-repository.port';
import { TESTING_SERVICE_REPOSITORY } from '../../domain/repositories/testing-service-repository.port';

@Injectable()
export class TestingServiceService {
  constructor(
    @Inject(TESTING_SERVICE_REPOSITORY)
    private readonly repository: TestingServiceRepositoryPort,
  ) {}

  async findAll(options?: {
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.isActive !== undefined) filters.isActive = options.isActive;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<TestingService | null> {
    return this.repository.findById(id);
  }

  async create(dto: {
    code: string;
    name: string;
    unitPrice: number;
    measurementUnit?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<TestingService> {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new Error('Testing service code already exists');
    }

    const entity = new TestingService({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      code: dto.code,
      name: dto.name,
      unitPrice: dto.unitPrice,
      measurementUnit: dto.measurementUnit,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      code?: string;
      name?: string;
      unitPrice?: number;
      measurementUnit?: string;
      description?: string;
      isActive?: boolean;
    },
  ): Promise<TestingService> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing service not found');
    }

    if (dto.code && dto.code !== existing.code) {
      const byCode = await this.repository.findByCode(dto.code);
      if (byCode) {
        throw new Error('Testing service code already exists');
      }
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
