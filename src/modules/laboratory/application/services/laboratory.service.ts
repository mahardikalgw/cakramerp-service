import { Injectable, Inject } from '@nestjs/common';
import { Laboratory } from '../../domain/entities/laboratory.entity';
import type { LaboratoryRepositoryPort } from '../../domain/repositories/laboratory-repository.port';
import { LABORATORY_REPOSITORY } from '../../domain/repositories/laboratory-repository.port';

@Injectable()
export class LaboratoryService {
  constructor(
    @Inject(LABORATORY_REPOSITORY)
    private readonly repository: LaboratoryRepositoryPort,
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

  async findById(id: string): Promise<Laboratory | null> {
    return this.repository.findById(id);
  }

  async create(dto: {
    name: string;
    location?: string;
    capacity?: number;
  }): Promise<Laboratory> {
    const entity = new Laboratory({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      name: dto.name,
      location: dto.location,
      capacity: dto.capacity,
      isActive: true,
    });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      name?: string;
      location?: string;
      capacity?: number;
      isActive?: boolean;
    },
  ): Promise<Laboratory> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Laboratory not found');
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
