import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ThrService } from './thr.service';
import { THR_REPOSITORY } from '../../domain/repositories/thr-repository.port';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port';
import { JOURNAL_ENTRY_SERVICE } from '../../../finance/application/ports/journal-entry-service.port';
import { ACCOUNT_REPOSITORY } from '../../../finance/domain/repositories/finance-repository.port';

describe('ThrService', () => {
  let service: ThrService;
  let thrRepo: any;
  let employeeRepo: any;
  let journalEntryService: any;
  let accountRepo: any;

  beforeEach(async () => {
    thrRepo = {
      findByYear: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      deleteByYear: jest.fn(),
    };
    employeeRepo = {
      findActiveEmployees: jest.fn(),
    };
    journalEntryService = {
      create: jest.fn(),
    };
    accountRepo = {
      findByCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThrService,
        { provide: THR_REPOSITORY, useValue: thrRepo },
        { provide: EMPLOYEE_REPOSITORY, useValue: employeeRepo },
        { provide: JOURNAL_ENTRY_SERVICE, useValue: journalEntryService },
        { provide: ACCOUNT_REPOSITORY, useValue: accountRepo },
      ],
    }).compile();

    service = module.get<ThrService>(ThrService);
  });

  describe('getRecords', () => {
    it('should return THR records for a given year', async () => {
      const records = [
        { id: 'thr-1', employeeId: 'emp-1', year: 2024, thrAmount: 5000000 },
      ];
      thrRepo.findByYear.mockResolvedValue(records);

      const result = await service.getRecords(2024);

      expect(result).toEqual(records);
      expect(thrRepo.findByYear).toHaveBeenCalledWith(2024);
    });

    it('should return empty array when no records found', async () => {
      thrRepo.findByYear.mockResolvedValue([]);

      const result = await service.getRecords(2024);

      expect(result).toEqual([]);
    });
  });

  describe('calculate', () => {
    it('should calculate THR for employees with >= 12 months service (full amount)', async () => {
      const employees = [
        {
          id: 'emp-1',
          fullName: 'John',
          joinDate: '2023-01-01',
          basicSalary: 5000000,
          employmentType: 'fulltime',
        },
      ];

      thrRepo.deleteByYear.mockResolvedValue(undefined);
      employeeRepo.findActiveEmployees.mockResolvedValue(employees);
      thrRepo.create.mockResolvedValue({});

      const result = await service.calculate(2024);

      expect(result.calculated).toBe(1);
      expect(result.excluded).toBe(0);
      expect(thrRepo.deleteByYear).toHaveBeenCalledWith(2024);
      expect(thrRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          employeeName: 'John',
          year: 2024,
          monthlySalary: 5000000,
          thrAmount: 5000000,
          isProRated: false,
          isExcluded: false,
          status: 'calculated',
        }),
      );
    });

    it('should pro-rate THR for employees with < 12 months service', async () => {
      const employees = [
        {
          id: 'emp-1',
          fullName: 'John',
          joinDate: '2023-10-01',
          basicSalary: 6000000,
          employmentType: 'fulltime',
        },
      ];

      thrRepo.deleteByYear.mockResolvedValue(undefined);
      employeeRepo.findActiveEmployees.mockResolvedValue(employees);
      thrRepo.create.mockResolvedValue({});

      const result = await service.calculate(2024);

      expect(result.calculated).toBe(1);
      expect(thrRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          monthsOfService: 6,
          isProRated: true,
          thrAmount: (6 / 12) * 6000000,
        }),
      );
    });

    it('should exclude employees with < 1 month of service', async () => {
      const employees = [
        {
          id: 'emp-1',
          fullName: 'New Guy',
          joinDate: '2024-03-15',
          basicSalary: 5000000,
          employmentType: 'fulltime',
        },
      ];

      thrRepo.deleteByYear.mockResolvedValue(undefined);
      employeeRepo.findActiveEmployees.mockResolvedValue(employees);

      const result = await service.calculate(2024);

      expect(result.calculated).toBe(0);
      expect(result.excluded).toBe(1);
      expect(thrRepo.create).not.toHaveBeenCalled();
    });

    it('should handle multiple employees with mixed eligibility', async () => {
      const employees = [
        {
          id: 'emp-1',
          fullName: 'Senior',
          joinDate: '2022-01-01',
          basicSalary: 10000000,
          employmentType: 'fulltime',
        },
        {
          id: 'emp-2',
          fullName: 'New',
          joinDate: '2024-12-15',
          basicSalary: 4000000,
          employmentType: 'contract',
        },
        {
          id: 'emp-3',
          fullName: 'Mid',
          joinDate: '2023-09-01',
          basicSalary: 7000000,
          employmentType: 'fulltime',
        },
      ];

      thrRepo.deleteByYear.mockResolvedValue(undefined);
      employeeRepo.findActiveEmployees.mockResolvedValue(employees);
      thrRepo.create.mockResolvedValue({});

      const result = await service.calculate(2024);

      // emp-1: 36 months (full), emp-3: 15 months (full), emp-2: 0 months (excluded)
      expect(result.calculated).toBe(2);
      expect(result.excluded).toBe(1);
      expect(thrRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('confirm', () => {
    it('should confirm a calculated THR record and create journal entry', async () => {
      const record = {
        id: 'thr-1',
        employeeId: 'emp-1',
        employeeName: 'John',
        year: 2024,
        thrAmount: 5000000,
        status: 'calculated',
      };
      const confirmed = { ...record, status: 'confirmed' };

      thrRepo.findById.mockResolvedValue(record);
      thrRepo.update.mockResolvedValue(confirmed);
      accountRepo.findByCode.mockResolvedValue({ id: 'acc-1' });
      journalEntryService.create.mockResolvedValue({});

      const result = await service.confirm('thr-1', 'user-1');

      expect(result).toEqual(confirmed);
      expect(thrRepo.update).toHaveBeenCalledWith(
        'thr-1',
        expect.objectContaining({
          status: 'confirmed',
        }),
      );
      expect(journalEntryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'THR payment - John (2024)',
          reference: 'THR-2024-emp-1',
        }),
        'user-1',
        false,
      );
    });

    it('should throw BadRequestException when record not found', async () => {
      thrRepo.findById.mockResolvedValue(null);

      await expect(service.confirm('nonexistent', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when record is not in calculated status', async () => {
      thrRepo.findById.mockResolvedValue({ id: 'thr-1', status: 'confirmed' });

      await expect(service.confirm('thr-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
