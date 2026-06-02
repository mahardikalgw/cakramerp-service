import { Test, TestingModule } from '@nestjs/testing';
import {
  StockMovementService,
  RecordMovementDto,
} from './stock-movement.service';
import { STOCK_MOVEMENT_REPOSITORY } from '../../domain/repositories/stock-movement-repository.port';

describe('StockMovementService', () => {
  let service: StockMovementService;
  let repo: {
    getBalance: jest.Mock;
    getBalances: jest.Mock;
    getStockCard: jest.Mock;
    upsertBalance: jest.Mock;
    createLedgerEntry: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      getBalance: jest.fn(),
      getBalances: jest.fn(),
      getStockCard: jest.fn(),
      upsertBalance: jest.fn(),
      createLedgerEntry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementService,
        { provide: STOCK_MOVEMENT_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = module.get<StockMovementService>(StockMovementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordMovement', () => {
    it('should compute new balance, upsert, and create ledger entry', async () => {
      const dto: RecordMovementDto = {
        itemId: 'item-1',
        warehouseId: 'wh-1',
        movementType: 'receipt',
        quantity: 50,
        referenceType: 'goods_receipt',
        referenceId: 'grn-1',
        description: 'GRN receipt',
        createdBy: 'user-1',
      };

      repo.getBalance.mockResolvedValue(100);
      repo.upsertBalance.mockResolvedValue(undefined);
      repo.createLedgerEntry.mockResolvedValue({
        id: 'ledger-1',
        balanceAfter: 150,
      });

      const result = await service.recordMovement(dto);

      expect(repo.getBalance).toHaveBeenCalledWith('item-1', 'wh-1');
      expect(repo.upsertBalance).toHaveBeenCalledWith('item-1', 'wh-1', 50);
      expect(repo.createLedgerEntry).toHaveBeenCalledWith({
        ...dto,
        balanceAfter: 150,
      });
      expect(result).toEqual({ id: 'ledger-1', balanceAfter: 150 });
    });

    it('should handle negative quantity (issuance)', async () => {
      const dto: RecordMovementDto = {
        itemId: 'item-1',
        warehouseId: 'wh-1',
        movementType: 'issuance',
        quantity: -30,
        createdBy: 'user-1',
      };

      repo.getBalance.mockResolvedValue(100);
      repo.upsertBalance.mockResolvedValue(undefined);
      repo.createLedgerEntry.mockResolvedValue({
        id: 'ledger-2',
        balanceAfter: 70,
      });

      const result = await service.recordMovement(dto);

      expect(repo.upsertBalance).toHaveBeenCalledWith('item-1', 'wh-1', -30);
      expect(repo.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({ balanceAfter: 70 }),
      );
    });

    it('should handle zero current balance', async () => {
      const dto: RecordMovementDto = {
        itemId: 'item-new',
        warehouseId: 'wh-1',
        movementType: 'receipt',
        quantity: 10,
        createdBy: 'user-1',
      };

      repo.getBalance.mockResolvedValue(0);
      repo.upsertBalance.mockResolvedValue(undefined);
      repo.createLedgerEntry.mockResolvedValue({
        id: 'ledger-3',
        balanceAfter: 10,
      });

      const result = await service.recordMovement(dto);

      expect(result.balanceAfter).toBe(10);
    });
  });

  describe('getStockBalance', () => {
    it('should return the balance from repository', async () => {
      repo.getBalance.mockResolvedValue(42);

      const result = await service.getStockBalance('item-1', 'wh-1');

      expect(repo.getBalance).toHaveBeenCalledWith('item-1', 'wh-1');
      expect(result).toBe(42);
    });

    it('should return 0 when no balance exists', async () => {
      repo.getBalance.mockResolvedValue(0);

      const result = await service.getStockBalance('item-x', 'wh-1');

      expect(result).toBe(0);
    });
  });

  describe('getStockBalances', () => {
    it('should return balances with filters', async () => {
      const balances = [
        { itemId: 'item-1', quantity: 50 },
        { itemId: 'item-2', quantity: 30 },
      ];
      repo.getBalances.mockResolvedValue(balances);

      const result = await service.getStockBalances({ warehouseId: 'wh-1' });

      expect(repo.getBalances).toHaveBeenCalledWith({ warehouseId: 'wh-1' });
      expect(result).toEqual(balances);
    });

    it('should work without filters', async () => {
      repo.getBalances.mockResolvedValue([]);

      const result = await service.getStockBalances();

      expect(repo.getBalances).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('getStockCard', () => {
    it('should return stock card entries', async () => {
      const entries = [
        { id: '1', movementType: 'receipt', quantity: 50 },
        { id: '2', movementType: 'issuance', quantity: -20 },
      ];
      repo.getStockCard.mockResolvedValue(entries);

      const result = await service.getStockCard('item-1');

      expect(repo.getStockCard).toHaveBeenCalledWith('item-1');
      expect(result).toEqual(entries);
    });

    it('should return empty array when no entries', async () => {
      repo.getStockCard.mockResolvedValue([]);

      const result = await service.getStockCard('item-empty');

      expect(result).toEqual([]);
    });
  });
});
