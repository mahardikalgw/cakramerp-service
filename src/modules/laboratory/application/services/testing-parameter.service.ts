import { Injectable, Inject } from '@nestjs/common';
import { TestingParameter } from '../../domain/entities/testing-parameter.entity';
import type { TestingParameterRepositoryPort } from '../../domain/repositories/testing-parameter-repository.port';
import { TESTING_PARAMETER_REPOSITORY } from '../../domain/repositories/testing-parameter-repository.port';

@Injectable()
export class TestingParameterService {
  constructor(
    @Inject(TESTING_PARAMETER_REPOSITORY)
    private readonly repository: TestingParameterRepositoryPort,
  ) {}

  async findAll(options?: {
    testingServiceId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const filters: Record<string, any> = {};
    if (options?.testingServiceId)
      filters.testingServiceId = options.testingServiceId;
    if (options?.isActive !== undefined) filters.isActive = options.isActive;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
      search: options?.search,
    });
  }

  async findByTestingServiceId(serviceId: string): Promise<TestingParameter[]> {
    return this.repository.findByTestingServiceId(serviceId);
  }

  async findById(id: string): Promise<TestingParameter | null> {
    return this.repository.findById(id);
  }

  async create(dto: {
    testingServiceId: string;
    name: string;
    standard?: string;
    unit?: string;
    isActive?: boolean;
  }): Promise<TestingParameter> {
    const entity = new TestingParameter({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      testingServiceId: dto.testingServiceId,
      name: dto.name,
      standard: dto.standard ?? null,
      unit: dto.unit ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      name?: string;
      standard?: string;
      unit?: string;
      isActive?: boolean;
    },
  ): Promise<TestingParameter> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing parameter not found');
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
