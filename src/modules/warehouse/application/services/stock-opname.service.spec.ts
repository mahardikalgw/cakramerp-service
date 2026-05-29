import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { StockOpnameService } from './stock-opname.service'
import { STOCK_OPNAME_REPOSITORY } from '../../domain/repositories/stock-opname-repository.port'
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port'

describe('StockOpnameService', () => {
  let service: StockOpnameService
  let stockOpnameRepo: {
    createSession: jest.Mock
    createLine: jest.Mock
    findAll: jest.Mock
    findById: jest.Mock
    findSessionById: jest.Mock
    findLinesBySessionId: jest.Mock
    findLineBySessionAndItem: jest.Mock
    updateSession: jest.Mock
    updateLine: jest.Mock
    getBalancesForWarehouse: jest.Mock
  }
  let stockMovementService: {
    recordMovement: jest.Mock
  }

  const mockSession = {
    id: 'session-1',
    warehouseId: 'wh-1',
    conductedBy: 'user-1',
    status: 'draft',
  }

  const mockLine = {
    id: 'line-1',
    sessionId: 'session-1',
    itemId: 'item-1',
    itemName: 'Widget',
    systemQty: 100,
    actualQty: 0,
    varianceQty: 0,
    uom: 'pcs',
  }

  beforeEach(async () => {
    stockOpnameRepo = {
      createSession: jest.fn(),
      createLine: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findSessionById: jest.fn(),
      findLinesBySessionId: jest.fn(),
      findLineBySessionAndItem: jest.fn(),
      updateSession: jest.fn(),
      updateLine: jest.fn(),
      getBalancesForWarehouse: jest.fn(),
    }
    stockMovementService = {
      recordMovement: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockOpnameService,
        { provide: STOCK_OPNAME_REPOSITORY, useValue: stockOpnameRepo },
        { provide: STOCK_MOVEMENT_SERVICE, useValue: stockMovementService },
      ],
    }).compile()

    service = module.get<StockOpnameService>(StockOpnameService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create session and lines from warehouse balances', async () => {
      const balances = [
        { itemId: 'item-1', itemName: 'Widget', quantity: 100, uom: 'pcs' },
        { itemId: 'item-2', itemName: 'Gear', quantity: 50, uom: 'pcs' },
      ]
      stockOpnameRepo.getBalancesForWarehouse.mockResolvedValue(balances)
      stockOpnameRepo.createSession.mockResolvedValue(mockSession)
      stockOpnameRepo.createLine
        .mockResolvedValueOnce(mockLine)
        .mockResolvedValueOnce({ ...mockLine, id: 'line-2', itemId: 'item-2', systemQty: 50 })

      const result = await service.create('wh-1', 'user-1')

      expect(stockOpnameRepo.getBalancesForWarehouse).toHaveBeenCalledWith('wh-1')
      expect(stockOpnameRepo.createSession).toHaveBeenCalledWith({
        warehouseId: 'wh-1',
        conductedBy: 'user-1',
        status: 'draft',
      })
      expect(stockOpnameRepo.createLine).toHaveBeenCalledTimes(2)
      expect(stockOpnameRepo.createLine).toHaveBeenNthCalledWith(1, {
        sessionId: 'session-1',
        itemId: 'item-1',
        itemName: 'Widget',
        systemQty: 100,
        actualQty: 0,
        varianceQty: 0,
        uom: 'pcs',
      })
      expect(result.session).toEqual(mockSession)
      expect(result.lines).toHaveLength(2)
    })

    it('should create session with empty lines when no balances', async () => {
      stockOpnameRepo.getBalancesForWarehouse.mockResolvedValue([])
      stockOpnameRepo.createSession.mockResolvedValue(mockSession)

      const result = await service.create('wh-1', 'user-1')

      expect(stockOpnameRepo.createLine).not.toHaveBeenCalled()
      expect(result.lines).toHaveLength(0)
    })
  })

  describe('updateCounts', () => {
    it('should update actual quantities and compute variance', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue({ ...mockSession, status: 'draft' })
      stockOpnameRepo.findLineBySessionAndItem.mockResolvedValue({ ...mockLine })
      stockOpnameRepo.updateLine.mockResolvedValue({
        ...mockLine,
        actualQty: 95,
        varianceQty: -5,
      })

      const result = await service.updateCounts('session-1', [
        { itemId: 'item-1', actualQty: 95 },
      ])

      expect(stockOpnameRepo.updateLine).toHaveBeenCalledWith('line-1', {
        actualQty: 95,
        varianceQty: -5,
      })
      expect(result).toHaveLength(1)
    })

    it('should throw BadRequestException when session not found', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue(null)

      await expect(
        service.updateCounts('missing', [{ itemId: 'item-1', actualQty: 10 }]),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when session is not draft', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue({ ...mockSession, status: 'pending_approval' })

      await expect(
        service.updateCounts('session-1', [{ itemId: 'item-1', actualQty: 10 }]),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when item not found in session', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue({ ...mockSession, status: 'draft' })
      stockOpnameRepo.findLineBySessionAndItem.mockResolvedValue(null)

      await expect(
        service.updateCounts('session-1', [{ itemId: 'unknown', actualQty: 10 }]),
      ).rejects.toThrow(BadRequestException)
    })

    it('should handle positive variance', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue({ ...mockSession, status: 'draft' })
      stockOpnameRepo.findLineBySessionAndItem.mockResolvedValue({ ...mockLine, systemQty: 100 })
      stockOpnameRepo.updateLine.mockResolvedValue({
        ...mockLine,
        actualQty: 110,
        varianceQty: 10,
      })

      const result = await service.updateCounts('session-1', [
        { itemId: 'item-1', actualQty: 110 },
      ])

      expect(result[0].varianceQty).toBe(10)
    })
  })

  describe('submit', () => {
    it('should update session status to pending_approval', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue({ ...mockSession, status: 'draft' })
      stockOpnameRepo.updateSession.mockResolvedValue({
        ...mockSession,
        status: 'pending_approval',
        submittedAt: new Date(),
      })

      const result = await service.submit('session-1')

      expect(stockOpnameRepo.updateSession).toHaveBeenCalledWith('session-1', {
        status: 'pending_approval',
        submittedAt: expect.any(Date),
      })
      expect(result.status).toBe('pending_approval')
    })

    it('should throw BadRequestException when session not found', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue(null)

      await expect(service.submit('missing')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when session is not draft', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue({ ...mockSession, status: 'approved' })

      await expect(service.submit('session-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('approve', () => {
    it('should apply adjustments for lines with variance and update session', async () => {
      const lines = [
        { ...mockLine, varianceQty: -5 },
        { ...mockLine, id: 'line-2', itemId: 'item-2', varianceQty: 10 },
        { ...mockLine, id: 'line-3', itemId: 'item-3', varianceQty: 0 },
      ]
      stockOpnameRepo.findSessionById.mockResolvedValue({
        ...mockSession,
        status: 'pending_approval',
        warehouseId: 'wh-1',
      })
      stockOpnameRepo.findLinesBySessionId.mockResolvedValue(lines)
      stockMovementService.recordMovement.mockResolvedValue({})
      stockOpnameRepo.updateSession.mockResolvedValue({
        ...mockSession,
        status: 'approved',
        approvedBy: 'user-2',
      })

      const result = await service.approve('session-1', 'user-2')

      // Should only record movements for lines with non-zero variance
      expect(stockMovementService.recordMovement).toHaveBeenCalledTimes(2)
      expect(stockMovementService.recordMovement).toHaveBeenNthCalledWith(1, expect.objectContaining({
        itemId: 'item-1',
        movementType: 'adjustment',
        quantity: -5,
        referenceType: 'stock_opname',
        referenceId: 'session-1',
      }))
      expect(stockMovementService.recordMovement).toHaveBeenNthCalledWith(2, expect.objectContaining({
        itemId: 'item-2',
        quantity: 10,
      }))
      expect(stockOpnameRepo.updateSession).toHaveBeenCalledWith('session-1', {
        status: 'approved',
        approvedBy: 'user-2',
        approvedAt: expect.any(Date),
      })
      expect(result.status).toBe('approved')
    })

    it('should not record movements when no variance', async () => {
      const lines = [{ ...mockLine, varianceQty: 0 }]
      stockOpnameRepo.findSessionById.mockResolvedValue({
        ...mockSession,
        status: 'pending_approval',
      })
      stockOpnameRepo.findLinesBySessionId.mockResolvedValue(lines)
      stockOpnameRepo.updateSession.mockResolvedValue({ ...mockSession, status: 'approved' })

      await service.approve('session-1', 'user-2')

      expect(stockMovementService.recordMovement).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException when session not found', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue(null)

      await expect(service.approve('missing', 'user-1')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when session is not pending_approval', async () => {
      stockOpnameRepo.findSessionById.mockResolvedValue({ ...mockSession, status: 'draft' })

      await expect(service.approve('session-1', 'user-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('findAll', () => {
    it('should return data and total', async () => {
      stockOpnameRepo.findAll.mockResolvedValue({ data: [mockSession], total: 1 })

      const result = await service.findAll({ warehouseId: 'wh-1', status: 'draft' })

      expect(stockOpnameRepo.findAll).toHaveBeenCalledWith({ warehouseId: 'wh-1', status: 'draft' })
      expect(result.data).toHaveLength(1)
    })

    it('should work without filters', async () => {
      stockOpnameRepo.findAll.mockResolvedValue({ data: [], total: 0 })

      const result = await service.findAll()

      expect(result).toEqual({ data: [], total: 0 })
    })
  })

  describe('findById', () => {
    it('should return session with lines', async () => {
      const detail = { session: mockSession, lines: [mockLine] }
      stockOpnameRepo.findById.mockResolvedValue(detail)

      const result = await service.findById('session-1')

      expect(result).toEqual(detail)
    })

    it('should return null when not found', async () => {
      stockOpnameRepo.findById.mockResolvedValue(null)

      const result = await service.findById('missing')

      expect(result).toBeNull()
    })
  })
})
