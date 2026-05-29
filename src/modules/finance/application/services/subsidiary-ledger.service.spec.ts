import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SubsidiaryLedgerService } from './subsidiary-ledger.service';
import { ArSubsidiaryLedgerTypeOrmEntity } from '../../infrastructure/entities/ar-subsidiary-ledger-typeorm.entity';
import { ApSubsidiaryLedgerTypeOrmEntity } from '../../infrastructure/entities/ap-subsidiary-ledger-typeorm.entity';

describe('SubsidiaryLedgerService', () => {
  let service: SubsidiaryLedgerService;

  const createQueryBuilderMock = () => ({
    createAlias: jest.fn(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  });

  const arRepoMock = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const apRepoMock = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity === ArSubsidiaryLedgerTypeOrmEntity) return arRepoMock;
      if (entity === ApSubsidiaryLedgerTypeOrmEntity) return apRepoMock;
      return apRepoMock;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubsidiaryLedgerService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(SubsidiaryLedgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getArLedger', () => {
    it('should return AR ledger with filters', async () => {
      const mockData = [{ id: '1', customerId: 'c1', debit: 100 }];
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([mockData, 1]);
      arRepoMock.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getArLedger({ customerId: 'c1', page: 1, limit: 10 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(qb.andWhere).toHaveBeenCalledWith('ar.customerId = :customerId', { customerId: 'c1' });
    });

    it('should apply date filters', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      arRepoMock.createQueryBuilder.mockReturnValue(qb);

      await service.getArLedger({ startDate: '2024-01-01', endDate: '2024-12-31' });

      expect(qb.andWhere).toHaveBeenCalledWith('ar.date >= :startDate', { startDate: '2024-01-01' });
      expect(qb.andWhere).toHaveBeenCalledWith('ar.date <= :endDate', { endDate: '2024-12-31' });
    });

    it('should use default pagination', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      arRepoMock.createQueryBuilder.mockReturnValue(qb);

      await service.getArLedger();

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  describe('getApLedger', () => {
    it('should return AP ledger with filters', async () => {
      const mockData = [{ id: '1', supplierId: 's1', credit: 200 }];
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([mockData, 1]);
      apRepoMock.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getApLedger({ supplierId: 's1', page: 1, limit: 10 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(qb.andWhere).toHaveBeenCalledWith('ap.supplierId = :supplierId', { supplierId: 's1' });
    });

    it('should apply invoice filter', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      apRepoMock.createQueryBuilder.mockReturnValue(qb);

      await service.getApLedger({ invoiceId: 'inv1' });

      expect(qb.andWhere).toHaveBeenCalledWith('ap.invoiceId = :invoiceId', { invoiceId: 'inv1' });
    });
  });

  describe('getArCustomerSummary', () => {
    it('should return customer summary', async () => {
      const summary = [
        { customerId: 'c1', customerName: 'Customer A', totalDebit: 500, totalCredit: 200, outstandingBalance: 300, transactionCount: 3 },
      ];
      mockDataSource.query.mockResolvedValue(summary);

      const result = await service.getArCustomerSummary();

      expect(result).toEqual(summary);
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('ar_subsidiary_ledger'));
    });
  });

  describe('getApSupplierSummary', () => {
    it('should return supplier summary', async () => {
      const summary = [
        { supplierId: 's1', supplierName: 'Supplier A', totalCredit: 400, totalDebit: 100, outstandingBalance: 300, transactionCount: 2 },
      ];
      mockDataSource.query.mockResolvedValue(summary);

      const result = await service.getApSupplierSummary();

      expect(result).toEqual(summary);
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('ap_subsidiary_ledger'));
    });
  });

  describe('getArInvoiceBalance', () => {
    it('should return invoice balance', async () => {
      mockDataSource.query.mockResolvedValue([{ debit: 1000, credit: 400, balance: 600 }]);

      const result = await service.getArInvoiceBalance('inv1');

      expect(result).toEqual({ debit: 1000, credit: 400, balance: 600 });
    });

    it('should return default zero balance when no data', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getArInvoiceBalance('inv1');

      expect(result).toEqual({ debit: 0, credit: 0, balance: 0 });
    });
  });

  describe('getApInvoiceBalance', () => {
    it('should return invoice balance', async () => {
      mockDataSource.query.mockResolvedValue([{ debit: 100, credit: 800, balance: 700 }]);

      const result = await service.getApInvoiceBalance('inv1');

      expect(result).toEqual({ debit: 100, credit: 800, balance: 700 });
    });

    it('should return default zero balance when no data', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getApInvoiceBalance('inv1');

      expect(result).toEqual({ debit: 0, credit: 0, balance: 0 });
    });
  });

  describe('recordArEntry', () => {
    it('should record AR entry with running balance from existing entry', async () => {
      const lastEntry = { balance: 500 };
      const savedEntry = { id: 'ar1', balance: 700 };

      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(lastEntry);
      arRepoMock.createQueryBuilder.mockReturnValue(qb);
      arRepoMock.create.mockReturnValue(savedEntry);
      arRepoMock.save.mockResolvedValue(savedEntry);

      const result = await service.recordArEntry({
        customerId: 'c1',
        customerName: 'Customer A',
        journalEntryId: 'je1',
        date: '2024-01-15',
        description: 'Invoice',
        debit: 200,
        credit: 0,
      });

      expect(result).toEqual(savedEntry);
      expect(arRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
        customerId: 'c1',
        customerName: 'Customer A',
        debit: 200,
        credit: 0,
        balance: 700,
      }));
    });

    it('should record AR entry with zero initial balance when no prior entries', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      arRepoMock.createQueryBuilder.mockReturnValue(qb);
      arRepoMock.create.mockReturnValue({ balance: 100 });
      arRepoMock.save.mockResolvedValue({ id: 'ar2', balance: 100 });

      await service.recordArEntry({
        customerId: 'c1',
        customerName: 'Customer A',
        date: '2024-01-15',
        description: 'First entry',
        debit: 100,
        credit: 0,
      });

      expect(arRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({ balance: 100 }));
    });
  });

  describe('recordApEntry', () => {
    it('should record AP entry with running balance', async () => {
      const lastEntry = { balance: 300 };
      const savedEntry = { id: 'ap1', balance: 500 };

      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(lastEntry);
      apRepoMock.createQueryBuilder.mockReturnValue(qb);
      apRepoMock.create.mockReturnValue(savedEntry);
      apRepoMock.save.mockResolvedValue(savedEntry);

      const result = await service.recordApEntry({
        supplierId: 's1',
        supplierName: 'Supplier A',
        date: '2024-01-15',
        description: 'Invoice',
        debit: 0,
        credit: 200,
      });

      expect(result).toEqual(savedEntry);
      expect(apRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
        supplierId: 's1',
        balance: 500,
      }));
    });

    it('should record AP entry with zero initial balance', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      apRepoMock.createQueryBuilder.mockReturnValue(qb);
      apRepoMock.create.mockReturnValue({ balance: -50 });
      apRepoMock.save.mockResolvedValue({ id: 'ap2', balance: -50 });

      await service.recordApEntry({
        supplierId: 's1',
        supplierName: 'Supplier A',
        date: '2024-01-15',
        description: 'Payment',
        debit: 50,
        credit: 0,
      });

      expect(apRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
        balance: -50,
      }));
    });
  });
});
