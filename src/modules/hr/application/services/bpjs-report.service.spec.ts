import { Test, TestingModule } from '@nestjs/testing';
import { BpjsReportService } from './bpjs-report.service';
import { BPJS_REPOSITORY } from '../../domain/repositories/bpjs-repository.port';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port';
import { PAYROLL_REPOSITORY } from '../../domain/repositories/payroll-repository.port';

describe('BpjsReportService', () => {
  let service: BpjsReportService;
  let bpjsRepo: any;
  let employeeRepo: any;
  let payrollRepo: any;

  beforeEach(async () => {
    bpjsRepo = {
      findActiveEnrollments: jest.fn(),
      findByEmployeeId: jest.fn(),
    };
    employeeRepo = {
      findById: jest.fn(),
    };
    payrollRepo = {
      findRunByMonthYear: jest.fn(),
      findDetailsByRunId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BpjsReportService,
        { provide: BPJS_REPOSITORY, useValue: bpjsRepo },
        { provide: EMPLOYEE_REPOSITORY, useValue: employeeRepo },
        { provide: PAYROLL_REPOSITORY, useValue: payrollRepo },
      ],
    }).compile();

    service = module.get<BpjsReportService>(BpjsReportService);
  });

  describe('generateReport', () => {
    it('should generate report with active enrollment and payroll data', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 5000000,
          enrollmentDate: '2023-01-01',
          endDate: null,
        },
      ];
      const employee = {
        id: 'emp-1',
        fullName: 'John Doe',
        employeeNumber: 'E001',
      };
      const payrollRun = { id: 'run-1' };
      const payrollDetails = [
        {
          employeeId: 'emp-1',
          basicSalary: 5000000,
          bpjsKesehatanEmployee: 50000,
          bpjsKesehatanEmployer: 200000,
          bpjsJkk: 12000,
          bpjsJkm: 15000,
          bpjsJht: 100000,
          bpjsJp: 50000,
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockImplementation(
        (month: number, year: number) => {
          if (month === 3 && year === 2024) return Promise.resolve(payrollRun);
          return Promise.resolve(null);
        },
      );
      payrollRepo.findDetailsByRunId.mockResolvedValue(payrollDetails);
      employeeRepo.findById.mockResolvedValue(employee);

      const result = await service.generateReport(3, 2024);

      expect(result).toHaveLength(1);
      expect(result[0].employeeName).toBe('John Doe');
      expect(result[0].employeeNumber).toBe('E001');
      expect(result[0].program).toBe('JHT');
      expect(result[0].memberNumber).toBe('BPJS-001');
      expect(result[0].salary).toBe(5000000);
      expect(result[0].status).toBe('active');
      expect(result[0].bpjsKesehatanEmployee).toBe(50000);
    });

    it('should detect new enrollment status', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 5000000,
          enrollmentDate: '2024-03-15',
          endDate: null,
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockResolvedValue(null);
      payrollRepo.findDetailsByRunId.mockResolvedValue([]);
      employeeRepo.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'John',
        employeeNumber: 'E001',
      });

      const result = await service.generateReport(3, 2024);

      expect(result[0].status).toBe('new');
    });

    it('should detect terminated enrollment status', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 5000000,
          enrollmentDate: '2023-01-01',
          endDate: '2024-03-20',
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockResolvedValue(null);
      payrollRepo.findDetailsByRunId.mockResolvedValue([]);
      employeeRepo.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'John',
        employeeNumber: 'E001',
      });

      const result = await service.generateReport(3, 2024);

      expect(result[0].status).toBe('terminated');
    });

    it('should detect salary_changed status when salary differs from prior month', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 6000000,
          enrollmentDate: '2023-01-01',
          endDate: null,
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockImplementation(
        (month: number, year: number) => {
          if (month === 3 && year === 2024)
            return Promise.resolve({ id: 'run-current' });
          if (month === 2 && year === 2024)
            return Promise.resolve({ id: 'run-prior' });
          return Promise.resolve(null);
        },
      );
      payrollRepo.findDetailsByRunId.mockImplementation((runId: string) => {
        if (runId === 'run-current')
          return Promise.resolve([
            {
              employeeId: 'emp-1',
              basicSalary: 6000000,
              bpjsKesehatanEmployee: 60000,
              bpjsKesehatanEmployer: 240000,
              bpjsJkk: 14400,
              bpjsJkm: 18000,
              bpjsJht: 120000,
              bpjsJp: 60000,
            },
          ]);
        if (runId === 'run-prior')
          return Promise.resolve([
            { employeeId: 'emp-1', basicSalary: 5000000 },
          ]);
        return Promise.resolve([]);
      });
      employeeRepo.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'John',
        employeeNumber: 'E001',
      });

      const result = await service.generateReport(3, 2024);

      expect(result[0].status).toBe('salary_changed');
      expect(result[0].previousSalary).toBe(5000000);
    });

    it('should skip enrollments where employee is not found', async () => {
      const enrollments = [
        {
          employeeId: 'emp-ghost',
          program: 'JHT',
          memberNumber: 'BPJS-999',
          salary: 5000000,
          enrollmentDate: '2023-01-01',
          endDate: null,
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockResolvedValue(null);
      payrollRepo.findDetailsByRunId.mockResolvedValue([]);
      employeeRepo.findById.mockResolvedValue(null);

      const result = await service.generateReport(3, 2024);

      expect(result).toHaveLength(0);
    });

    it('should return empty report when no enrollments exist', async () => {
      bpjsRepo.findActiveEnrollments.mockResolvedValue([]);

      const result = await service.generateReport(3, 2024);

      expect(result).toEqual([]);
    });
  });

  describe('exportReport', () => {
    it('should export CSV with BPJS portal format', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 5000000,
          enrollmentDate: '2023-01-01',
          endDate: null,
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockResolvedValue(null);
      payrollRepo.findDetailsByRunId.mockResolvedValue([]);
      employeeRepo.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'John Doe',
        employeeNumber: 'E001',
      });

      const result = await service.exportReport(3, 2024);

      expect(result).toContain('No');
      expect(result).toContain('Nomor Peserta');
      expect(result).toContain('Nama Peserta');
      expect(result).toContain('BPJS-001');
      expect(result).toContain('"John Doe"');
      expect(result).toContain('E001');
      expect(result).toContain('JHT');
      expect(result).toContain('AKTIF');
    });

    it('should label new enrollments as BARU', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 5000000,
          enrollmentDate: '2024-03-10',
          endDate: null,
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockResolvedValue(null);
      payrollRepo.findDetailsByRunId.mockResolvedValue([]);
      employeeRepo.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'John',
        employeeNumber: 'E001',
      });

      const result = await service.exportReport(3, 2024);

      expect(result).toContain('BARU');
    });

    it('should label terminated enrollments as KELUAR', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 5000000,
          enrollmentDate: '2023-01-01',
          endDate: '2024-03-15',
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockResolvedValue(null);
      payrollRepo.findDetailsByRunId.mockResolvedValue([]);
      employeeRepo.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'John',
        employeeNumber: 'E001',
      });

      const result = await service.exportReport(3, 2024);

      expect(result).toContain('KELUAR');
    });

    it('should label salary changes as PERUBAHAN UPAH', async () => {
      const enrollments = [
        {
          employeeId: 'emp-1',
          program: 'JHT',
          memberNumber: 'BPJS-001',
          salary: 6000000,
          enrollmentDate: '2023-01-01',
          endDate: null,
        },
      ];

      bpjsRepo.findActiveEnrollments.mockResolvedValue(enrollments);
      payrollRepo.findRunByMonthYear.mockImplementation(
        (month: number, year: number) => {
          if (month === 3 && year === 2024)
            return Promise.resolve({ id: 'run-current' });
          if (month === 2 && year === 2024)
            return Promise.resolve({ id: 'run-prior' });
          return Promise.resolve(null);
        },
      );
      payrollRepo.findDetailsByRunId.mockImplementation((runId: string) => {
        if (runId === 'run-current')
          return Promise.resolve([
            {
              employeeId: 'emp-1',
              basicSalary: 6000000,
              bpjsKesehatanEmployee: 60000,
              bpjsKesehatanEmployer: 240000,
              bpjsJkk: 14400,
              bpjsJkm: 18000,
              bpjsJht: 120000,
              bpjsJp: 60000,
            },
          ]);
        if (runId === 'run-prior')
          return Promise.resolve([
            { employeeId: 'emp-1', basicSalary: 5000000 },
          ]);
        return Promise.resolve([]);
      });
      employeeRepo.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'John',
        employeeNumber: 'E001',
      });

      const result = await service.exportReport(3, 2024);

      expect(result).toContain('PERUBAHAN UPAH');
    });
  });
});
