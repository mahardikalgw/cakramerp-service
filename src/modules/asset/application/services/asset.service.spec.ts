import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AssetService } from './asset.service';
import { ASSET_REPOSITORY } from '../../domain/repositories/asset-repository.port';
import { GL_POSTING_QUEUE_SERVICE } from '../../../finance/application/ports/gl-posting-queue-service.port';

describe('AssetService', () => {
  let service: AssetService;

  const mockAssetRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getLastAssetNumber: jest.fn(),
    getDepreciationHistory: jest.fn(),
    createDepreciation: jest.fn(),
    findAssetsDueForDepreciation: jest.fn(),
  };

  const mockGlPostingQueueService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    createEntry: jest.fn(),
    postToJournal: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetService,
        { provide: ASSET_REPOSITORY, useValue: mockAssetRepo },
        {
          provide: GL_POSTING_QUEUE_SERVICE,
          useValue: mockGlPostingQueueService,
        },
      ],
    }).compile();

    service = module.get(AssetService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all assets with filters', async () => {
      const expectedResult = {
        data: [{ id: 'asset-1', name: 'Laptop' }],
        total: 1,
      };
      mockAssetRepo.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll({
        search: 'laptop',
        status: 'active',
      });

      expect(result).toEqual(expectedResult);
      expect(mockAssetRepo.findAll).toHaveBeenCalledWith({
        search: 'laptop',
        status: 'active',
      });
    });

    it('should return all assets without filters', async () => {
      const expectedResult = { data: [], total: 0 };
      mockAssetRepo.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockAssetRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findById', () => {
    it('should return an asset by id', async () => {
      const asset = { id: 'asset-1', name: 'Laptop', status: 'active' };
      mockAssetRepo.findById.mockResolvedValue(asset);

      const result = await service.findById('asset-1');

      expect(result).toEqual(asset);
    });

    it('should throw NotFoundException if asset not found', async () => {
      mockAssetRepo.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an asset with generated asset number', async () => {
      mockAssetRepo.getLastAssetNumber.mockResolvedValue(null);
      const createdAsset = {
        id: 'asset-1',
        assetNumber: 'AST-2024-0001',
        name: 'Laptop',
      };
      mockAssetRepo.create.mockResolvedValue(createdAsset);

      const result = await service.create({
        name: 'Laptop',
        category: 'IT',
        acquisitionDate: '2024-01-01',
        acquisitionCost: 15000000,
        usefulLifeMonths: 36,
        depreciationMethod: 'straight_line',
      });

      const currentYear = new Date().getFullYear();
      expect(result).toEqual(createdAsset);
      expect(mockAssetRepo.create).toHaveBeenCalled();
      const createArg = mockAssetRepo.create.mock.calls[0][0];
      expect(createArg.assetNumber).toBe(`AST-${currentYear}-0001`);
      expect(createArg.currentBookValue).toBe(15000000);
      expect(createArg.accumulatedDepreciation).toBe(0);
      expect(createArg.status).toBe('active');
    });

    it('should increment asset number from last number', async () => {
      const currentYear = new Date().getFullYear();
      mockAssetRepo.getLastAssetNumber.mockResolvedValue(
        `AST-${currentYear}-0005`,
      );
      mockAssetRepo.create.mockResolvedValue({ id: 'asset-2' });

      await service.create({
        name: 'Monitor',
        acquisitionDate: '2024-01-01',
        acquisitionCost: 5000000,
        usefulLifeMonths: 24,
        depreciationMethod: 'straight_line',
      });

      const createArg = mockAssetRepo.create.mock.calls[0][0];
      expect(createArg.assetNumber).toBe(`AST-${currentYear}-0006`);
    });

    it('should auto-calculate declining balance rate if not provided', async () => {
      mockAssetRepo.getLastAssetNumber.mockResolvedValue(null);
      mockAssetRepo.create.mockResolvedValue({ id: 'asset-1' });

      await service.create({
        name: 'Vehicle',
        acquisitionDate: '2024-01-01',
        acquisitionCost: 500000000,
        usefulLifeMonths: 60,
        depreciationMethod: 'declining_balance',
      });

      const createArg = mockAssetRepo.create.mock.calls[0][0];
      expect(createArg.decliningBalanceRate).toBeCloseTo(0.4, 5); // 2 / (60/12) = 0.4
    });

    it('should throw BadRequestException for unit_production method without totalEstimatedUnits', async () => {
      mockAssetRepo.getLastAssetNumber.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Machine',
          acquisitionDate: '2024-01-01',
          acquisitionCost: 100000000,
          usefulLifeMonths: 48,
          depreciationMethod: 'unit_production',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set salvage value to 0 if not provided', async () => {
      mockAssetRepo.getLastAssetNumber.mockResolvedValue(null);
      mockAssetRepo.create.mockResolvedValue({ id: 'asset-1' });

      await service.create({
        name: 'Desk',
        acquisitionDate: '2024-01-01',
        acquisitionCost: 2000000,
        usefulLifeMonths: 60,
        depreciationMethod: 'straight_line',
      });

      const createArg = mockAssetRepo.create.mock.calls[0][0];
      expect(createArg.salvageValue).toBe(0);
    });
  });

  describe('update', () => {
    it('should update an existing asset', async () => {
      const asset = { id: 'asset-1', name: 'Laptop', usefulLifeMonths: 36 };
      mockAssetRepo.findById.mockResolvedValue(asset);
      mockAssetRepo.update.mockResolvedValue({
        ...asset,
        name: 'Gaming Laptop',
      });

      const result = await service.update('asset-1', { name: 'Gaming Laptop' });

      expect(result.name).toBe('Gaming Laptop');
      expect(mockAssetRepo.update).toHaveBeenCalledWith('asset-1', {
        name: 'Gaming Laptop',
      });
    });

    it('should throw NotFoundException if asset not found', async () => {
      mockAssetRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should recalculate declining balance rate when method changes', async () => {
      const asset = { id: 'asset-1', usefulLifeMonths: 48 };
      mockAssetRepo.findById.mockResolvedValue(asset);
      mockAssetRepo.update.mockResolvedValue(asset);

      await service.update('asset-1', {
        depreciationMethod: 'declining_balance',
      });

      const updateArg = mockAssetRepo.update.mock.calls[0][1];
      expect(updateArg.decliningBalanceRate).toBeCloseTo(0.5, 5); // 2 / (48/12) = 0.5
    });

    it('should throw BadRequestException for unit_production without totalEstimatedUnits', async () => {
      const asset = {
        id: 'asset-1',
        usefulLifeMonths: 48,
        totalEstimatedUnits: null,
      };
      mockAssetRepo.findById.mockResolvedValue(asset);

      await expect(
        service.update('asset-1', { depreciationMethod: 'unit_production' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete an asset', async () => {
      const asset = { id: 'asset-1', name: 'Laptop' };
      mockAssetRepo.findById.mockResolvedValue(asset);
      mockAssetRepo.delete.mockResolvedValue(undefined);

      await service.delete('asset-1');

      expect(mockAssetRepo.delete).toHaveBeenCalledWith('asset-1');
    });

    it('should throw NotFoundException if asset not found', async () => {
      mockAssetRepo.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDepreciationHistory', () => {
    it('should return depreciation history for asset', async () => {
      const asset = { id: 'asset-1', name: 'Laptop' };
      const history = [
        {
          id: 'dep-1',
          depreciationAmount: 500000,
          periodDate: new Date('2024-01-01'),
        },
        {
          id: 'dep-2',
          depreciationAmount: 500000,
          periodDate: new Date('2024-02-01'),
        },
      ];
      mockAssetRepo.findById.mockResolvedValue(asset);
      mockAssetRepo.getDepreciationHistory.mockResolvedValue(history);

      const result = await service.getDepreciationHistory('asset-1');

      expect(result).toEqual(history);
      expect(mockAssetRepo.getDepreciationHistory).toHaveBeenCalledWith(
        'asset-1',
      );
    });

    it('should throw NotFoundException if asset not found', async () => {
      mockAssetRepo.findById.mockResolvedValue(null);

      await expect(
        service.getDepreciationHistory('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateDepreciation', () => {
    const currentYear = new Date().getFullYear();
    const baseAsset = {
      id: 'asset-1',
      assetNumber: `AST-${currentYear}-0001`,
      name: 'Laptop',
      acquisitionCost: 12000000,
      salvageValue: 0,
      usefulLifeMonths: 12,
      depreciationMethod: 'straight_line',
      depreciationSchedule: 'monthly',
      currentBookValue: 12000000,
      accumulatedDepreciation: 0,
      status: 'active',
      lastDepreciationDate: null,
    };

    it('should calculate straight line depreciation', async () => {
      mockAssetRepo.findById.mockResolvedValue(baseAsset);
      const depEntry = { id: 'dep-1', depreciationAmount: 1000000 };
      mockAssetRepo.createDepreciation.mockResolvedValue(depEntry);
      mockAssetRepo.update.mockResolvedValue({});
      mockGlPostingQueueService.createEntry.mockResolvedValue({});

      const result = await service.calculateDepreciation('asset-1');

      expect(result).toEqual(depEntry);
      expect(mockAssetRepo.createDepreciation).toHaveBeenCalled();
      expect(mockAssetRepo.update).toHaveBeenCalled();
      expect(mockGlPostingQueueService.createEntry).toHaveBeenCalled();
    });

    it('should calculate declining balance depreciation', async () => {
      const asset = {
        ...baseAsset,
        depreciationMethod: 'declining_balance',
        decliningBalanceRate: 0.4,
        currentBookValue: 10000000,
      };
      mockAssetRepo.findById.mockResolvedValue(asset);
      mockAssetRepo.createDepreciation.mockResolvedValue({ id: 'dep-1' });
      mockAssetRepo.update.mockResolvedValue({});
      mockGlPostingQueueService.createEntry.mockResolvedValue({});

      const result = await service.calculateDepreciation('asset-1');

      expect(mockAssetRepo.createDepreciation).toHaveBeenCalled();
      const depArg = mockAssetRepo.createDepreciation.mock.calls[0][0];
      expect(depArg.depreciationAmount).toBeCloseTo(333333.33, 1); // 10000000 * 0.4 / 12
    });

    it('should calculate unit production depreciation', async () => {
      const asset = {
        ...baseAsset,
        depreciationMethod: 'unit_production',
        acquisitionCost: 10000000,
        salvageValue: 1000000,
        totalEstimatedUnits: 10000,
        unitsProducedToDate: 0,
      };
      mockAssetRepo.findById.mockResolvedValue(asset);
      mockAssetRepo.createDepreciation.mockResolvedValue({ id: 'dep-1' });
      mockAssetRepo.update.mockResolvedValue({});
      mockGlPostingQueueService.createEntry.mockResolvedValue({});

      const result = await service.calculateDepreciation('asset-1', 500);

      const depArg = mockAssetRepo.createDepreciation.mock.calls[0][0];
      // (10000000 - 1000000) * (500 / 10000) = 450000
      expect(depArg.depreciationAmount).toBe(450000);
    });

    it('should throw NotFoundException if asset not found', async () => {
      mockAssetRepo.findById.mockResolvedValue(null);

      await expect(
        service.calculateDepreciation('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if asset is not active', async () => {
      mockAssetRepo.findById.mockResolvedValue({
        ...baseAsset,
        status: 'disposed',
      });

      await expect(service.calculateDepreciation('asset-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if asset is fully depreciated', async () => {
      mockAssetRepo.findById.mockResolvedValue({
        ...baseAsset,
        currentBookValue: 0,
        salvageValue: 0,
      });

      await expect(service.calculateDepreciation('asset-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unit_production without unitsProduced', async () => {
      mockAssetRepo.findById.mockResolvedValue({
        ...baseAsset,
        depreciationMethod: 'unit_production',
        totalEstimatedUnits: 10000,
      });

      await expect(service.calculateDepreciation('asset-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unknown depreciation method', async () => {
      mockAssetRepo.findById.mockResolvedValue({
        ...baseAsset,
        depreciationMethod: 'unknown_method',
      });

      await expect(service.calculateDepreciation('asset-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not depreciate below salvage value', async () => {
      mockAssetRepo.findById.mockResolvedValue({
        ...baseAsset,
        currentBookValue: 1050000,
        salvageValue: 1000000,
        usefulLifeMonths: 12,
      });
      mockAssetRepo.createDepreciation.mockResolvedValue({ id: 'dep-1' });
      mockAssetRepo.update.mockResolvedValue({});
      mockGlPostingQueueService.createEntry.mockResolvedValue({});

      await service.calculateDepreciation('asset-1');

      const depArg = mockAssetRepo.createDepreciation.mock.calls[0][0];
      // Max depreciation = 1050000 - 1000000 = 50000
      // Straight line monthly = (12000000 - 0) / 12 = 1000000 (but capped at 50000)
      expect(depArg.depreciationAmount).toBe(50000);
    });

    it('should set status to fully_depreciated when at salvage value', async () => {
      mockAssetRepo.findById.mockResolvedValue({
        ...baseAsset,
        currentBookValue: 1001000,
        salvageValue: 1000000,
        usefulLifeMonths: 12,
      });
      mockAssetRepo.createDepreciation.mockResolvedValue({ id: 'dep-1' });
      mockAssetRepo.update.mockResolvedValue({});
      mockGlPostingQueueService.createEntry.mockResolvedValue({});

      await service.calculateDepreciation('asset-1');

      const updateArg = mockAssetRepo.update.mock.calls[0][1];
      expect(updateArg.status).toBe('fully_depreciated');
    });

    it('should create GL posting entry with correct format', async () => {
      const currentYear = new Date().getFullYear();
      mockAssetRepo.findById.mockResolvedValue(baseAsset);
      mockAssetRepo.createDepreciation.mockResolvedValue({ id: 'dep-1' });
      mockAssetRepo.update.mockResolvedValue({});
      mockGlPostingQueueService.createEntry.mockResolvedValue({});

      await service.calculateDepreciation('asset-1');

      expect(mockGlPostingQueueService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'asset_depreciation',
          sourceId: 'asset-1',
          sourceNumber: `AST-${currentYear}-0001`,
          eventType: 'depreciation',
          amount: 1000000,
          suggestedLines: expect.arrayContaining([
            expect.objectContaining({
              accountName: 'Depreciation Expense',
              debit: 1000000,
              credit: 0,
            }),
            expect.objectContaining({
              accountName: 'Accumulated Depreciation',
              debit: 0,
              credit: 1000000,
            }),
          ]),
        }),
      );
    });
  });
});
