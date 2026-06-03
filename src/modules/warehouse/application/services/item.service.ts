import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ITEM_REPOSITORY } from '../../domain/repositories/item-repository.port';
import type { ItemRepositoryPort } from '../../domain/repositories/item-repository.port';
import type {
  ItemServicePort,
  ItemResponseDto,
} from '../ports/item-service.port';
import { CreateItemCommand } from '../commands/create-item.command';
import { UpdateItemCommand } from '../commands/update-item.command';

@Injectable()
export class ItemService implements ItemServicePort {
  constructor(
    @Inject(ITEM_REPOSITORY)
    private readonly repo: ItemRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: ItemResponseDto[]; total: number }> {
    const { data, total } = await this.repo.findAll(filters);
    return { data: data.map((i) => this.toResponse(i)), total };
  }

  async findById(id: string): Promise<ItemResponseDto | null> {
    const entity = await this.repo.findById(id);
    return entity ? this.toResponse(entity) : null;
  }

  async create(command: CreateItemCommand): Promise<ItemResponseDto> {
    const existing = await this.repo.findByCode(command.code);
    if (existing) {
      throw new ConflictException('Item with this code already exists');
    }

    const entity = this.repo.create({
      code: command.code,
      name: command.name,
      category: command.category,
      uom: command.uom,
      minStockLevel: command.minStockLevel ?? 0,
      isActive: true,
    });

    const saved = await this.repo.save(entity);
    return this.toResponse(saved);
  }

  async update(
    id: string,
    command: UpdateItemCommand,
  ): Promise<ItemResponseDto> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException('Item not found');

    if (command.code !== undefined) {
      const existing = await this.repo.findByCode(command.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Item with this code already exists');
      }
      entity.code = command.code;
    }
    if (command.name !== undefined) entity.name = command.name;
    if (command.category !== undefined) entity.category = command.category;
    if (command.uom !== undefined) entity.uom = command.uom;
    if (command.minStockLevel !== undefined)
      entity.minStockLevel = command.minStockLevel;
    if (command.isActive !== undefined) entity.isActive = command.isActive;

    const saved = await this.repo.save(entity);
    return this.toResponse(saved);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException('Item not found');
    await this.repo.delete(id);
  }

  private toResponse(entity: any): ItemResponseDto {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      category: entity.category,
      uom: entity.uom,
      minStockLevel: Number(entity.minStockLevel),
      isActive: entity.isActive,
      createdAt: entity.createdAt?.toISOString?.() ?? String(entity.createdAt),
      updatedAt: entity.updatedAt?.toISOString?.() ?? String(entity.updatedAt),
    };
  }
}
