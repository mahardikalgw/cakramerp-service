import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common'
import { ITEM_REPOSITORY } from '../../domain/repositories/item-repository.port'
import type { ItemRepositoryPort } from '../../domain/repositories/item-repository.port'
import type {
  ItemServicePort,
  ItemResponseDto,
  CreateItemDto,
  UpdateItemDto,
} from '../ports/item-service.port'

@Injectable()
export class ItemService implements ItemServicePort {
  constructor(
    @Inject(ITEM_REPOSITORY)
    private readonly repo: ItemRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string
    category?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: ItemResponseDto[]; total: number }> {
    const { data, total } = await this.repo.findAll(filters)
    return { data: data.map(this.toResponse), total }
  }

  async findById(id: string): Promise<ItemResponseDto | null> {
    const entity = await this.repo.findById(id)
    return entity ? this.toResponse(entity) : null
  }

  async create(dto: CreateItemDto): Promise<ItemResponseDto> {
    const existing = await this.repo.findByCode(dto.code)
    if (existing) {
      throw new ConflictException('Item with this code already exists')
    }

    const entity = this.repo.create({
      code: dto.code,
      name: dto.name,
      category: dto.category,
      uom: dto.uom,
      minStockLevel: dto.minStockLevel ?? 0,
      isActive: true,
    })

    const saved = await this.repo.save(entity)
    return this.toResponse(saved)
  }

  async update(id: string, dto: UpdateItemDto): Promise<ItemResponseDto> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new NotFoundException('Item not found')

    if (dto.code !== undefined) {
      const existing = await this.repo.findByCode(dto.code)
      if (existing && existing.id !== id) {
        throw new ConflictException('Item with this code already exists')
      }
      entity.code = dto.code
    }
    if (dto.name !== undefined) entity.name = dto.name
    if (dto.category !== undefined) entity.category = dto.category
    if (dto.uom !== undefined) entity.uom = dto.uom
    if (dto.minStockLevel !== undefined) entity.minStockLevel = dto.minStockLevel
    if (dto.isActive !== undefined) entity.isActive = dto.isActive

    const saved = await this.repo.save(entity)
    return this.toResponse(saved)
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new NotFoundException('Item not found')
    await this.repo.delete(id)
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
    }
  }
}
