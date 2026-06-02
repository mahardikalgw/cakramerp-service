import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  StockIssuanceService,
  CreateStockIssuanceDto,
} from './stock-issuance.service';
import { STOCK_ISSUANCE_REPOSITORY } from '../../domain/repositories/stock-issuance-repository.port';
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port';
import { GL_POSTING_QUEUE_SERVICE } from '../../../finance/application/ports/gl-posting-queue-service.port';

describe('StockIssuanceService', () => {
  let service: StockIssuanceService;
  let stockIssuanceRepo: {
    create: jest.Mock;
    createLine: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    findLinesById: jest.Mock;
    update: jest.Mock;
    getLastIssuanceNumber: jest.Mock;
  };
  let stockMovementService: {
    recordMovement: jest.Mock;
    getStockBalance: jest.Mock;
  };
  let glPostingQueueService: {
    createEntry: jest.Mock;
  };
  let mockDataSource: {
    query: jest.Mock;
  };

  const mockIssuance = {
    id: 'iss-1',
    issuanceNumber: 'ISS-2025-0001',
    warehouseId: 'wh-1',
    destinationType: 'project',
    destinationId: 'proj-1',
    destinationName: 'Project Alpha',
    status: 'confirmed',
  };

  const mockIssuanceLine = {
    id: 'iss-line-1',
    issuanceId: 'iss-1',
    itemId: 'item-1',
    itemName: 'Widget',
    quantity: 20,
    uom: 'pcs',
  };

  beforeEach(async () => {
    stockIssuanceRepo = {
      create: jest.fn(),
      createLine: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findLinesById: jest.fn(),
      update: jest.fn(),
      getLastIssuanceNumber: jest.fn(),
    };
    stockMovementService = {
      recordMovement: jest.fn(),
      getStockBalance: jest.fn(),
    };
    glPostingQueueService = {
      createEntry: jest.fn().mockResolvedValue({ id: 'queue-1' }),
    };
    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ unit_cost: 10 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockIssuanceService,
        { provide: STOCK_ISSUANCE_REPOSITORY, useValue: stockIssuanceRepo },
        { provide: STOCK_MOVEMENT_SERVICE, useValue: stockMovementService },
        { provide: GL_POSTING_QUEUE_SERVICE, useValue: glPostingQueueService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<StockIssuanceService>(StockIssuanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto: CreateStockIssuanceDto = {
      warehouseId: 'wh-1',
      destinationType: 'project',
      destinationId: 'proj-1',
      destinationName: 'Project Alpha',
      issuanceDate: '2025-06-01',
      lines: [
        { itemId: 'item-1', itemName: 'Widget', quantity: 20, uom: 'pcs' },
      ],
    };

    it('should create issuance and record negative stock movements', async () => {
      const year = new Date().getFullYear();
      stockMovementService.getStockBalance.mockResolvedValue(50);
      stockIssuanceRepo.getLastIssuanceNumber.mockResolvedValue(null);
      stockIssuanceRepo.create.mockResolvedValue(mockIssuance);
      stockIssuanceRepo.createLine.mockResolvedValue(mockIssuanceLine);
      stockMovementService.recordMovement.mockResolvedValue({});

      const result = await service.create(validDto, 'user-1');

      expect(stockMovementService.getStockBalance).toHaveBeenCalledWith(
        'item-1',
        'wh-1',
      );
      expect(stockIssuanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          issuanceNumber: `ISS-${year}-0001`,
          status: 'confirmed',
          createdBy: 'user-1',
        }),
      );
      expect(stockMovementService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'issuance',
          quantity: -20,
          referenceType: 'stock_issuance',
        }),
      );
      expect(result.issuance).toEqual(mockIssuance);
      expect(result.lines).toHaveLength(1);
    });

    it('should throw BadRequestException when lines is empty', async () => {
      const dto = { ...validDto, lines: [] };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lines is undefined', async () => {
      const dto = { warehouseId: 'wh-1' } as any;

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      stockMovementService.getStockBalance.mockResolvedValue(10);

      await expect(service.create(validDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validDto, 'user-1')).rejects.toThrow(
        /Insufficient stock/,
      );
      expect(stockIssuanceRepo.create).not.toHaveBeenCalled();
    });

    it('should allow issuance when stock is exactly equal to requested', async () => {
      stockMovementService.getStockBalance.mockResolvedValue(20);
      stockIssuanceRepo.getLastIssuanceNumber.mockResolvedValue(null);
      stockIssuanceRepo.create.mockResolvedValue(mockIssuance);
      stockIssuanceRepo.createLine.mockResolvedValue(mockIssuanceLine);
      stockMovementService.recordMovement.mockResolvedValue({});

      const result = await service.create(validDto, 'user-1');

      expect(result.issuance).toBeDefined();
    });

    it('should increment issuance number from last number', async () => {
      const year = new Date().getFullYear();
      stockMovementService.getStockBalance.mockResolvedValue(100);
      stockIssuanceRepo.getLastIssuanceNumber.mockResolvedValue(
        `ISS-${year}-0010`,
      );
      stockIssuanceRepo.create.mockResolvedValue(mockIssuance);
      stockIssuanceRepo.createLine.mockResolvedValue(mockIssuanceLine);
      stockMovementService.recordMovement.mockResolvedValue({});

      await service.create(validDto, 'user-1');

      expect(stockIssuanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          issuanceNumber: `ISS-${year}-0011`,
        }),
      );
    });

    it('should process multiple lines', async () => {
      const dto: CreateStockIssuanceDto = {
        ...validDto,
        lines: [
          { itemId: 'item-1', itemName: 'Widget', quantity: 10, uom: 'pcs' },
          { itemId: 'item-2', itemName: 'Gear', quantity: 5, uom: 'pcs' },
        ],
      };
      stockMovementService.getStockBalance.mockResolvedValue(100);
      stockIssuanceRepo.getLastIssuanceNumber.mockResolvedValue(null);
      stockIssuanceRepo.create.mockResolvedValue(mockIssuance);
      stockIssuanceRepo.createLine
        .mockResolvedValueOnce(mockIssuanceLine)
        .mockResolvedValueOnce({
          ...mockIssuanceLine,
          id: 'iss-line-2',
          itemId: 'item-2',
        });
      stockMovementService.recordMovement.mockResolvedValue({});

      const result = await service.create(dto, 'user-1');

      expect(stockIssuanceRepo.createLine).toHaveBeenCalledTimes(2);
      expect(stockMovementService.recordMovement).toHaveBeenCalledTimes(2);
      expect(result.lines).toHaveLength(2);
    });
  });

  describe('reverse', () => {
    it('should reverse an issuance and create positive movements', async () => {
      stockIssuanceRepo.findById.mockResolvedValue({
        issuance: { ...mockIssuance },
        lines: [mockIssuanceLine],
      });
      stockMovementService.recordMovement.mockResolvedValue({});
      stockIssuanceRepo.update.mockResolvedValue({
        ...mockIssuance,
        status: 'reversed',
      });

      const result = await service.reverse('iss-1', 'Wrong quantity', 'user-1');

      expect(stockIssuanceRepo.findById).toHaveBeenCalledWith('iss-1');
      expect(stockMovementService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'issuance_reversal',
          quantity: 20,
        }),
      );
      expect(stockIssuanceRepo.update).toHaveBeenCalledWith(
        'iss-1',
        expect.objectContaining({
          status: 'reversed',
          reversalReason: 'Wrong quantity',
        }),
      );
    });

    it('should throw BadRequestException when issuance not found', async () => {
      stockIssuanceRepo.findById.mockResolvedValue(null);

      await expect(
        service.reverse('missing', 'reason', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when issuance is already reversed', async () => {
      stockIssuanceRepo.findById.mockResolvedValue({
        issuance: { ...mockIssuance, status: 'reversed' },
        lines: [],
      });

      await expect(
        service.reverse('iss-1', 'reason', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reverse('iss-1', 'reason', 'user-1'),
      ).rejects.toThrow(/already reversed/);
    });
  });

  describe('findAll', () => {
    it('should return data and total', async () => {
      stockIssuanceRepo.findAll.mockResolvedValue({
        data: [mockIssuance],
        total: 1,
      });

      const result = await service.findAll({ warehouseId: 'wh-1' });

      expect(stockIssuanceRepo.findAll).toHaveBeenCalledWith({
        warehouseId: 'wh-1',
      });
      expect(result.data).toHaveLength(1);
    });

    it('should work without filters', async () => {
      stockIssuanceRepo.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findAll();

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findById', () => {
    it('should return issuance with lines', async () => {
      const detail = { issuance: mockIssuance, lines: [mockIssuanceLine] };
      stockIssuanceRepo.findById.mockResolvedValue(detail);

      const result = await service.findById('iss-1');

      expect(result).toEqual(detail);
    });

    it('should return null when not found', async () => {
      stockIssuanceRepo.findById.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });
});
