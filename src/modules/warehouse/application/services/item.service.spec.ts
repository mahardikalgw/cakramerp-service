import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { ItemService } from './item.service'
import { ITEM_REPOSITORY } from '../../domain/repositories/item-repository.port'
import { CreateItemCommand } from '../commands/create-item.command'
import { UpdateItemCommand } from '../commands/update-item.command'

describe('ItemService', () => {
  let service: ItemService
  let repo: {
    findAll: jest.Mock
    findById: jest.Mock
    findByCode: jest.Mock
    save: jest.Mock
    create: jest.Mock
    delete: jest.Mock
  }

  const now = new Date('2025-01-01T00:00:00Z')

  const mockEntity = {
    id: 'item-1',
    code: 'ITM-001',
    name: 'Widget',
    category: 'spare-parts',
    uom: 'pcs',
    minStockLevel: 10,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemService,
        { provide: ITEM_REPOSITORY, useValue: repo },
      ],
    }).compile()

    service = module.get<ItemService>(ItemService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAll', () => {
    it('should return mapped data and total', async () => {
      repo.findAll.mockResolvedValue({ data: [mockEntity], total: 1 })

      const result = await service.findAll({ search: 'wid' })

      expect(repo.findAll).toHaveBeenCalledWith({ search: 'wid' })
      expect(result.total).toBe(1)
      expect(result.data[0]).toEqual({
        id: 'item-1',
        code: 'ITM-001',
        name: 'Widget',
        category: 'spare-parts',
        uom: 'pcs',
        minStockLevel: 10,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
    })

    it('should return empty data when no items found', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 })

      const result = await service.findAll()

      expect(result).toEqual({ data: [], total: 0 })
    })

    it('should handle filters with pagination', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 })

      await service.findAll({ page: 2, limit: 5, category: 'tools', isActive: true })

      expect(repo.findAll).toHaveBeenCalledWith({ page: 2, limit: 5, category: 'tools', isActive: true })
    })
  })

  describe('findById', () => {
    it('should return mapped dto when entity found', async () => {
      repo.findById.mockResolvedValue(mockEntity)

      const result = await service.findById('item-1')

      expect(repo.findById).toHaveBeenCalledWith('item-1')
      expect(result!.id).toBe('item-1')
      expect(result!.code).toBe('ITM-001')
    })

    it('should return null when entity not found', async () => {
      repo.findById.mockResolvedValue(null)

      const result = await service.findById('missing')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create and return mapped dto', async () => {
      const command = new CreateItemCommand('ITM-002', 'Gear', 'spare-parts', 'pcs', 5)
      repo.findByCode.mockResolvedValue(null)
      repo.create.mockReturnValue({ ...mockEntity, code: 'ITM-002', name: 'Gear', minStockLevel: 5 })
      repo.save.mockResolvedValue({ ...mockEntity, code: 'ITM-002', name: 'Gear', minStockLevel: 5 })

      const result = await service.create(command)

      expect(repo.findByCode).toHaveBeenCalledWith('ITM-002')
      expect(repo.create).toHaveBeenCalledWith({
        code: 'ITM-002',
        name: 'Gear',
        category: 'spare-parts',
        uom: 'pcs',
        minStockLevel: 5,
        isActive: true,
      })
      expect(result.code).toBe('ITM-002')
    })

    it('should default minStockLevel to 0 when not provided', async () => {
      const command = new CreateItemCommand('ITM-003', 'Bolt', 'consumable', 'pcs')
      repo.findByCode.mockResolvedValue(null)
      repo.create.mockReturnValue({ ...mockEntity, minStockLevel: 0 })
      repo.save.mockResolvedValue({ ...mockEntity, minStockLevel: 0 })

      await service.create(command)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ minStockLevel: 0 }))
    })

    it('should throw ConflictException when code already exists', async () => {
      const command = new CreateItemCommand('ITM-001', 'Duplicate', 'spare-parts', 'pcs')
      repo.findByCode.mockResolvedValue(mockEntity)

      await expect(service.create(command)).rejects.toThrow(ConflictException)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update and return mapped dto', async () => {
      const command = new UpdateItemCommand(undefined, 'Updated Widget')
      repo.findById.mockResolvedValue({ ...mockEntity })
      repo.save.mockResolvedValue({ ...mockEntity, name: 'Updated Widget' })

      const result = await service.update('item-1', command)

      expect(repo.findById).toHaveBeenCalledWith('item-1')
      expect(repo.save).toHaveBeenCalled()
      expect(result.name).toBe('Updated Widget')
    })

    it('should throw NotFoundException when entity not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.update('missing', new UpdateItemCommand())).rejects.toThrow(NotFoundException)
    })

    it('should throw ConflictException when updating code to an existing one', async () => {
      const command = new UpdateItemCommand('ITM-002')
      repo.findById.mockResolvedValue({ ...mockEntity })
      repo.findByCode.mockResolvedValue({ id: 'other-id', code: 'ITM-002' })

      await expect(service.update('item-1', command)).rejects.toThrow(ConflictException)
    })

    it('should allow updating code to the same code', async () => {
      const command = new UpdateItemCommand('ITM-001')
      repo.findById.mockResolvedValue({ ...mockEntity })
      repo.findByCode.mockResolvedValue({ id: 'item-1', code: 'ITM-001' })
      repo.save.mockResolvedValue({ ...mockEntity })

      const result = await service.update('item-1', command)

      expect(result).toBeDefined()
    })

    it('should only update provided fields', async () => {
      const entity = { ...mockEntity, category: 'old-cat', uom: 'kg' }
      repo.findById.mockResolvedValue(entity)
      const command = new UpdateItemCommand(undefined, undefined, 'new-cat')

      const savedEntity = { ...entity, category: 'new-cat' }
      repo.save.mockImplementation((e) => Promise.resolve(e))

      await service.update('item-1', command)

      const saved = repo.save.mock.calls[0][0]
      expect(saved.category).toBe('new-cat')
      expect(saved.uom).toBe('kg')
    })
  })

  describe('delete', () => {
    it('should delete when entity exists', async () => {
      repo.findById.mockResolvedValue(mockEntity)
      repo.delete.mockResolvedValue(undefined)

      await service.delete('item-1')

      expect(repo.delete).toHaveBeenCalledWith('item-1')
    })

    it('should throw NotFoundException when entity not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.delete('missing')).rejects.toThrow(NotFoundException)
      expect(repo.delete).not.toHaveBeenCalled()
    })
  })
})
