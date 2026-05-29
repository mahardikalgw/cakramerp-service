import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { EquipmentService, CreateEquipmentDto, UpdateEquipmentDto, LogMaintenanceDto } from './equipment.service'
import { EQUIPMENT_REPOSITORY } from '../../domain/repositories/equipment-repository.port'

describe('EquipmentService', () => {
  let service: EquipmentService
  let repo: {
    findAll: jest.Mock
    findById: jest.Mock
    create: jest.Mock
    update: jest.Mock
    createMaintenanceLog: jest.Mock
    getMaintenanceSchedules: jest.Mock
    getMaintenanceLogs: jest.Mock
    updateSchedulesAfterMaintenance: jest.Mock
    findDueForMaintenance: jest.Mock
  }

  const mockEquipment = {
    id: 'eq-1',
    unitId: 'EXC-001',
    type: 'excavator',
    brand: 'Caterpillar',
    model: '320D',
    year: 2020,
    siteId: 'site-1',
    siteName: 'Site A',
    status: 'active',
    currentHours: 5000,
  }

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createMaintenanceLog: jest.fn(),
      getMaintenanceSchedules: jest.fn(),
      getMaintenanceLogs: jest.fn(),
      updateSchedulesAfterMaintenance: jest.fn(),
      findDueForMaintenance: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: EQUIPMENT_REPOSITORY, useValue: repo },
      ],
    }).compile()

    service = module.get<EquipmentService>(EquipmentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAll', () => {
    it('should return equipment with maintenance status "ok" when no schedules', async () => {
      repo.findAll.mockResolvedValue({ data: [mockEquipment], total: 1 })
      repo.getMaintenanceSchedules.mockResolvedValue([])

      const result = await service.findAll()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].maintenanceStatus).toBe('ok')
    })

    it('should return "overdue" when schedule is past due', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      repo.findAll.mockResolvedValue({ data: [mockEquipment], total: 1 })
      repo.getMaintenanceSchedules.mockResolvedValue([{ nextDueAt: pastDate }])

      const result = await service.findAll()

      expect(result.data[0].maintenanceStatus).toBe('overdue')
    })

    it('should return "due_soon" when schedule is within 7 days', async () => {
      const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      repo.findAll.mockResolvedValue({ data: [mockEquipment], total: 1 })
      repo.getMaintenanceSchedules.mockResolvedValue([{ nextDueAt: soonDate }])

      const result = await service.findAll()

      expect(result.data[0].maintenanceStatus).toBe('due_soon')
    })

    it('should return "ok" when schedule is more than 7 days away', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      repo.findAll.mockResolvedValue({ data: [mockEquipment], total: 1 })
      repo.getMaintenanceSchedules.mockResolvedValue([{ nextDueAt: futureDate }])

      const result = await service.findAll()

      expect(result.data[0].maintenanceStatus).toBe('ok')
    })

    it('should return "overdue" if any schedule is overdue even with others due soon', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      repo.findAll.mockResolvedValue({ data: [mockEquipment], total: 1 })
      repo.getMaintenanceSchedules.mockResolvedValue([
        { nextDueAt: soonDate },
        { nextDueAt: pastDate },
      ])

      const result = await service.findAll()

      expect(result.data[0].maintenanceStatus).toBe('overdue')
    })

    it('should pass filters to repository', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 })

      await service.findAll({ type: 'excavator', siteId: 'site-1', status: 'active', page: 1, limit: 10 })

      expect(repo.findAll).toHaveBeenCalledWith({ type: 'excavator', siteId: 'site-1', status: 'active', page: 1, limit: 10 })
    })

    it('should handle schedule with null nextDueAt', async () => {
      repo.findAll.mockResolvedValue({ data: [mockEquipment], total: 1 })
      repo.getMaintenanceSchedules.mockResolvedValue([{ nextDueAt: null }])

      const result = await service.findAll()

      expect(result.data[0].maintenanceStatus).toBe('ok')
    })
  })

  describe('findById', () => {
    it('should return equipment with schedules and logs', async () => {
      const schedules = [{ id: 'sched-1', type: 'oil-change' }]
      const logs = [{ id: 'log-1', type: 'repair' }]
      repo.findById.mockResolvedValue(mockEquipment)
      repo.getMaintenanceSchedules.mockResolvedValue(schedules)
      repo.getMaintenanceLogs.mockResolvedValue(logs)

      const result = await service.findById('eq-1')

      expect(repo.findById).toHaveBeenCalledWith('eq-1')
      expect(result.equipment).toEqual(mockEquipment)
      expect(result.schedules).toEqual(schedules)
      expect(result.recentLogs).toEqual(logs)
    })

    it('should return null when equipment not found', async () => {
      repo.findById.mockResolvedValue(null)

      const result = await service.findById('missing')

      expect(result).toBeNull()
      expect(repo.getMaintenanceSchedules).not.toHaveBeenCalled()
      expect(repo.getMaintenanceLogs).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should create equipment with provided data', async () => {
      const dto: CreateEquipmentDto = {
        unitId: 'EXC-002',
        type: 'excavator',
        brand: 'Komatsu',
        model: 'PC200',
        year: 2022,
      }
      repo.create.mockResolvedValue({ id: 'eq-2', ...dto, status: 'active', currentHours: 0 })

      const result = await service.create(dto)

      expect(repo.create).toHaveBeenCalledWith({
        unitId: 'EXC-002',
        type: 'excavator',
        brand: 'Komatsu',
        model: 'PC200',
        year: 2022,
        siteId: undefined,
        siteName: undefined,
        status: 'active',
        currentHours: 0,
      })
      expect(result.id).toBe('eq-2')
    })

    it('should use default status and currentHours when not provided', async () => {
      const dto: CreateEquipmentDto = {
        unitId: 'EXC-003',
        type: 'bulldozer',
        brand: 'CAT',
        model: 'D6',
        year: 2021,
      }
      repo.create.mockResolvedValue({ id: 'eq-3' })

      await service.create(dto)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'active',
        currentHours: 0,
      }))
    })

    it('should pass optional siteId, siteName, status, and currentHours', async () => {
      const dto: CreateEquipmentDto = {
        unitId: 'EXC-004',
        type: 'excavator',
        brand: 'Hitachi',
        model: 'ZX200',
        year: 2023,
        siteId: 'site-2',
        siteName: 'Site B',
        status: 'maintenance',
        currentHours: 1500,
      }
      repo.create.mockResolvedValue({ id: 'eq-4' })

      await service.create(dto)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        siteId: 'site-2',
        siteName: 'Site B',
        status: 'maintenance',
        currentHours: 1500,
      }))
    })
  })

  describe('update', () => {
    it('should update and return equipment', async () => {
      const dto: UpdateEquipmentDto = { status: 'maintenance', currentHours: 5500 }
      repo.findById.mockResolvedValue(mockEquipment)
      repo.update.mockResolvedValue({ ...mockEquipment, ...dto })

      const result = await service.update('eq-1', dto)

      expect(repo.findById).toHaveBeenCalledWith('eq-1')
      expect(repo.update).toHaveBeenCalledWith('eq-1', dto)
      expect(result.status).toBe('maintenance')
    })

    it('should throw BadRequestException when equipment not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.update('missing', { status: 'active' })).rejects.toThrow(BadRequestException)
    })
  })

  describe('logMaintenance', () => {
    const logDto: LogMaintenanceDto = {
      maintenanceDate: '2025-06-01',
      hoursAtMaintenance: 5200,
      type: 'oil-change',
      description: 'Regular oil change',
      cost: 500,
      performedBy: 'tech-1',
    }

    it('should create log, update hours, and update schedules', async () => {
      const savedLog = { id: 'log-1', equipmentId: 'eq-1', ...logDto }
      repo.findById.mockResolvedValue(mockEquipment)
      repo.createMaintenanceLog.mockResolvedValue(savedLog)
      repo.update.mockResolvedValue({ ...mockEquipment, currentHours: 5200 })
      repo.updateSchedulesAfterMaintenance.mockResolvedValue(undefined)

      const result = await service.logMaintenance('eq-1', logDto, 'user-1')

      expect(repo.findById).toHaveBeenCalledWith('eq-1')
      expect(repo.createMaintenanceLog).toHaveBeenCalledWith({
        equipmentId: 'eq-1',
        maintenanceDate: new Date('2025-06-01'),
        hoursAtMaintenance: 5200,
        type: 'oil-change',
        description: 'Regular oil change',
        cost: 500,
        performedBy: 'tech-1',
        createdBy: 'user-1',
      })
      expect(repo.update).toHaveBeenCalledWith('eq-1', { currentHours: 5200 })
      expect(repo.updateSchedulesAfterMaintenance).toHaveBeenCalledWith(
        'eq-1',
        new Date('2025-06-01'),
        5200,
      )
      expect(result).toEqual(savedLog)
    })

    it('should throw BadRequestException when equipment not found', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.logMaintenance('missing', logDto, 'user-1')).rejects.toThrow(BadRequestException)
    })

    it('should not proceed with other operations if log creation fails', async () => {
      repo.findById.mockResolvedValue(mockEquipment)
      repo.createMaintenanceLog.mockRejectedValue(new Error('DB error'))

      await expect(service.logMaintenance('eq-1', logDto, 'user-1')).rejects.toThrow('DB error')
      expect(repo.update).not.toHaveBeenCalled()
      expect(repo.updateSchedulesAfterMaintenance).not.toHaveBeenCalled()
    })
  })

  describe('getMaintenanceSchedules', () => {
    it('should return schedules for equipment', async () => {
      const schedules = [{ id: 's-1', type: 'oil-change' }]
      repo.getMaintenanceSchedules.mockResolvedValue(schedules)

      const result = await service.getMaintenanceSchedules('eq-1')

      expect(repo.getMaintenanceSchedules).toHaveBeenCalledWith('eq-1')
      expect(result).toEqual(schedules)
    })

    it('should return empty array when no schedules', async () => {
      repo.getMaintenanceSchedules.mockResolvedValue([])

      const result = await service.getMaintenanceSchedules('eq-1')

      expect(result).toEqual([])
    })
  })

  describe('getMaintenanceLogs', () => {
    it('should return logs for equipment', async () => {
      const logs = [{ id: 'l-1', type: 'repair' }]
      repo.getMaintenanceLogs.mockResolvedValue(logs)

      const result = await service.getMaintenanceLogs('eq-1')

      expect(repo.getMaintenanceLogs).toHaveBeenCalledWith('eq-1')
      expect(result).toEqual(logs)
    })

    it('should return empty array when no logs', async () => {
      repo.getMaintenanceLogs.mockResolvedValue([])

      const result = await service.getMaintenanceLogs('eq-1')

      expect(result).toEqual([])
    })
  })
})
