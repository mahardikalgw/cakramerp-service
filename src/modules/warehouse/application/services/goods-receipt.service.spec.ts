import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  GoodsReceiptService,
  CreateGoodsReceiptDto,
} from './goods-receipt.service';
import { GOODS_RECEIPT_REPOSITORY } from '../../domain/repositories/goods-receipt-repository.port';
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port';
import { GL_POSTING_QUEUE_PORT } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';

describe('GoodsReceiptService', () => {
  let service: GoodsReceiptService;
  let goodsReceiptRepo: {
    create: jest.Mock;
    createLine: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    getLastGrnNumber: jest.Mock;
  };
  let stockMovementService: {
    recordMovement: jest.Mock;
    getStockBalance: jest.Mock;
    getStockBalances: jest.Mock;
    getStockCard: jest.Mock;
  };
  let glPostingQueueService: {
    createEntry: jest.Mock;
  };
  let mockDataSource: {
    query: jest.Mock;
  };

  const mockReceipt = {
    id: 'grn-1',
    grnNumber: 'GRN-2025-0001',
    warehouseId: 'wh-1',
    vendorName: 'Supplier A',
    status: 'confirmed',
  };

  const mockLine = {
    id: 'grn-line-1',
    goodsReceiptId: 'grn-1',
    itemId: 'item-1',
    itemName: 'Widget',
    poQty: 100,
    receivedQty: 95,
    discrepancyQty: 5,
    uom: 'pcs',
  };

  beforeEach(async () => {
    goodsReceiptRepo = {
      create: jest.fn(),
      createLine: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      getLastGrnNumber: jest.fn(),
    };
    stockMovementService = {
      recordMovement: jest.fn(),
      getStockBalance: jest.fn(),
      getStockBalances: jest.fn(),
      getStockCard: jest.fn(),
    };
    glPostingQueueService = {
      createEntry: jest.fn().mockResolvedValue({ id: 'queue-1' }),
    };
    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptService,
        { provide: GOODS_RECEIPT_REPOSITORY, useValue: goodsReceiptRepo },
        { provide: STOCK_MOVEMENT_SERVICE, useValue: stockMovementService },
        { provide: GL_POSTING_QUEUE_PORT, useValue: glPostingQueueService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<GoodsReceiptService>(GoodsReceiptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto: CreateGoodsReceiptDto = {
      warehouseId: 'wh-1',
      vendorName: 'Supplier A',
      receivedDate: '2025-06-01',
      lines: [
        {
          itemId: 'item-1',
          itemName: 'Widget',
          poQty: 100,
          receivedQty: 95,
          uom: 'pcs',
        },
        {
          itemId: 'item-2',
          itemName: 'Gear',
          poQty: 50,
          receivedQty: 50,
          uom: 'pcs',
        },
      ],
    };

    it('should create receipt, lines, and record stock movements', async () => {
      const year = new Date().getFullYear();
      goodsReceiptRepo.getLastGrnNumber.mockResolvedValue(null);
      goodsReceiptRepo.create.mockResolvedValue(mockReceipt);
      goodsReceiptRepo.createLine
        .mockResolvedValueOnce(mockLine)
        .mockResolvedValueOnce({
          ...mockLine,
          id: 'grn-line-2',
          itemId: 'item-2',
        });
      stockMovementService.recordMovement.mockResolvedValue({});

      const result = await service.create(validDto, 'user-1');

      expect(goodsReceiptRepo.getLastGrnNumber).toHaveBeenCalledWith(
        expect.stringContaining(`GRN-${year}-`),
      );
      expect(goodsReceiptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          grnNumber: expect.stringContaining(`GRN-${year}-`),
          warehouseId: 'wh-1',
          vendorName: 'Supplier A',
          status: 'confirmed',
          createdBy: 'user-1',
        }),
      );
      expect(goodsReceiptRepo.createLine).toHaveBeenCalledTimes(2);
      expect(stockMovementService.recordMovement).toHaveBeenCalledTimes(2);
      expect(stockMovementService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item-1',
          warehouseId: 'wh-1',
          movementType: 'receipt',
          quantity: 95,
          referenceType: 'goods_receipt',
          referenceId: 'grn-1',
        }),
      );
      expect(result.receipt).toEqual(mockReceipt);
      expect(result.lines).toHaveLength(2);
    });

    it('should compute discrepancyQty correctly', async () => {
      goodsReceiptRepo.getLastGrnNumber.mockResolvedValue(null);
      goodsReceiptRepo.create.mockResolvedValue(mockReceipt);
      goodsReceiptRepo.createLine.mockResolvedValue(mockLine);
      stockMovementService.recordMovement.mockResolvedValue({});

      await service.create(validDto, 'user-1');

      expect(goodsReceiptRepo.createLine).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          discrepancyQty: 5,
        }),
      );
    });

    it('should increment GRN number from last number', async () => {
      const year = new Date().getFullYear();
      goodsReceiptRepo.getLastGrnNumber.mockResolvedValue(`GRN-${year}-0005`);
      goodsReceiptRepo.create.mockResolvedValue(mockReceipt);
      goodsReceiptRepo.createLine.mockResolvedValue(mockLine);
      stockMovementService.recordMovement.mockResolvedValue({});

      await service.create(validDto, 'user-1');

      expect(goodsReceiptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          grnNumber: `GRN-${year}-0006`,
        }),
      );
    });

    it('should throw BadRequestException when lines is empty', async () => {
      const dto = { ...validDto, lines: [] };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lines is undefined', async () => {
      const dto = {
        warehouseId: 'wh-1',
        vendorName: 'X',
        receivedDate: '2025-01-01',
      } as any;

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass poId and supplierId when provided', async () => {
      const dto: CreateGoodsReceiptDto = {
        ...validDto,
        poId: 'po-1',
        supplierId: 'sup-1',
        notes: 'Partial delivery',
      };
      goodsReceiptRepo.getLastGrnNumber.mockResolvedValue(null);
      goodsReceiptRepo.create.mockResolvedValue(mockReceipt);
      goodsReceiptRepo.createLine.mockResolvedValue(mockLine);
      stockMovementService.recordMovement.mockResolvedValue({});

      await service.create(dto, 'user-1');

      expect(goodsReceiptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          poId: 'po-1',
          supplierId: 'sup-1',
          notes: 'Partial delivery',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return data and total', async () => {
      goodsReceiptRepo.findAll.mockResolvedValue({
        data: [mockReceipt],
        total: 1,
      });

      const result = await service.findAll({ warehouseId: 'wh-1' });

      expect(goodsReceiptRepo.findAll).toHaveBeenCalledWith({
        warehouseId: 'wh-1',
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should work without filters', async () => {
      goodsReceiptRepo.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findAll();

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findById', () => {
    it('should return receipt with lines', async () => {
      const detail = { receipt: mockReceipt, lines: [mockLine] };
      goodsReceiptRepo.findById.mockResolvedValue(detail);

      const result = await service.findById('grn-1');

      expect(goodsReceiptRepo.findById).toHaveBeenCalledWith('grn-1');
      expect(result).toEqual(detail);
    });

    it('should return null when not found', async () => {
      goodsReceiptRepo.findById.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });
});
