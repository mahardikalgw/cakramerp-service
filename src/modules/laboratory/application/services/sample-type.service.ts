import { Injectable, Inject } from '@nestjs/common';
import { SampleType } from '../../domain/entities/sample-type.entity';
import type { SampleTypeRepositoryPort } from '../../domain/repositories/sample-type-repository.port';
import { SAMPLE_TYPE_REPOSITORY } from '../../domain/repositories/sample-type-repository.port';

@Injectable()
export class SampleTypeService {
  constructor(
    @Inject(SAMPLE_TYPE_REPOSITORY)
    private readonly repository: SampleTypeRepositoryPort,
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

  async findById(id: string): Promise<SampleType | null> {
    return this.repository.findById(id);
  }

  async create(dto: {
    code: string;
    name: string;
    description?: string;
  }): Promise<SampleType> {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new Error('Sample type code already exists');
    }

    const entity = new SampleType({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      isActive: true,
    });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      code?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    },
  ): Promise<SampleType> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Sample type not found');
    }

    if (dto.code && dto.code !== existing.code) {
      const byCode = await this.repository.findByCode(dto.code);
      if (byCode) {
        throw new Error('Sample type code already exists');
      }
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
