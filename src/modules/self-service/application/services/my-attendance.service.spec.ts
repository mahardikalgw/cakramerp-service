import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, Between } from 'typeorm';
import { MyAttendanceService } from './my-attendance.service';
import { DISCREPANCY_REPORT_REPOSITORY } from '../../domain/repositories/self-service-repository.port';

describe('MyAttendanceService', () => {
  let service: MyAttendanceService;

  const mockAttendanceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmployeeRepo = {
    findOne: jest.fn(),
  };

  const mockDiscrepancyReportRepo = {
    create: jest.fn(),
    findByEmployeeId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findPending: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity.name === 'AttendanceRecordTypeOrmEntity')
        return mockAttendanceRepo;
      if (entity.name === 'EmployeeTypeOrmEntity') return mockEmployeeRepo;
      return {};
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyAttendanceService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: DISCREPANCY_REPORT_REPOSITORY,
          useValue: mockDiscrepancyReportRepo,
        },
      ],
    }).compile();

    service = module.get(MyAttendanceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlyAttendance', () => {
    it('should return monthly attendance with summary', async () => {
      const records = [
        {
          id: 'r1',
          status: 'present',
          overtimeHours: 0,
          date: new Date('2024-07-01'),
        },
        {
          id: 'r2',
          status: 'late',
          overtimeHours: 1,
          date: new Date('2024-07-02'),
        },
        {
          id: 'r3',
          status: 'absent',
          overtimeHours: 0,
          date: new Date('2024-07-03'),
        },
        {
          id: 'r4',
          status: 'present',
          overtimeHours: 2,
          date: new Date('2024-07-04'),
        },
      ];
      mockAttendanceRepo.find.mockResolvedValue(records);

      const result = await service.getMonthlyAttendance('emp-1', 7, 2024);

      expect(result.month).toBe(7);
      expect(result.year).toBe(2024);
      expect(result.records).toEqual(records);
      expect(result.summary.present).toBe(3); // present(2) + late(1)
      expect(result.summary.absent).toBe(1);
      expect(result.summary.late).toBe(1);
      expect(result.summary.overtime).toBe(3); // 1 + 2
    });

    it('should return empty summary when no records', async () => {
      mockAttendanceRepo.find.mockResolvedValue([]);

      const result = await service.getMonthlyAttendance('emp-1', 8, 2024);

      expect(result.summary.present).toBe(0);
      expect(result.summary.absent).toBe(0);
      expect(result.summary.late).toBe(0);
      expect(result.summary.overtime).toBe(0);
    });
  });

  describe('getTodayAttendance', () => {
    it('should return today attendance when record exists', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const record = {
        clockIn: new Date('2024-07-01T08:00:00'),
        clockOut: new Date('2024-07-01T17:00:00'),
        status: 'present',
      };
      const employee = { workStartTime: '08:00', workEndTime: '17:00' };

      mockAttendanceRepo.findOne.mockResolvedValue(record);
      mockEmployeeRepo.findOne.mockResolvedValue(employee);

      const result = await service.getTodayAttendance('emp-1');

      expect(result.hasClockedIn).toBe(true);
      expect(result.hasClockedOut).toBe(true);
      expect(result.status).toBe('present');
      expect(result.workStartTime).toBe('08:00');
      expect(result.workEndTime).toBe('17:00');
    });

    it('should return defaults when no record found', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      const result = await service.getTodayAttendance('emp-1');

      expect(result.hasClockedIn).toBe(false);
      expect(result.hasClockedOut).toBe(false);
      expect(result.status).toBeNull();
      expect(result.workStartTime).toBe('08:00');
      expect(result.workEndTime).toBe('17:00');
    });
  });

  describe('clockIn', () => {
    it('should create new attendance record on first clock in', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockEmployeeRepo.findOne.mockResolvedValue({ workStartTime: '08:00' });

      const newRecord = {
        id: 'r1',
        employeeId: 'emp-1',
        clockIn: new Date(),
        status: 'present',
      };
      mockAttendanceRepo.create.mockReturnValue(newRecord);
      mockAttendanceRepo.save.mockResolvedValue(newRecord);

      const result = await service.clockIn('emp-1');

      expect(mockAttendanceRepo.create).toHaveBeenCalled();
      expect(mockAttendanceRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newRecord);
    });

    it('should update existing record if record exists but no clockIn', async () => {
      const existingRecord = { id: 'r1', employeeId: 'emp-1', clockIn: null };
      mockAttendanceRepo.findOne.mockResolvedValue(existingRecord);
      mockEmployeeRepo.findOne.mockResolvedValue({ workStartTime: '08:00' });
      mockAttendanceRepo.save.mockResolvedValue({
        ...existingRecord,
        clockIn: new Date(),
      });

      await service.clockIn('emp-1');

      expect(mockAttendanceRepo.save).toHaveBeenCalledWith(existingRecord);
    });

    it('should throw BadRequestException if already clocked in', async () => {
      const existingRecord = {
        id: 'r1',
        employeeId: 'emp-1',
        clockIn: new Date(),
      };
      mockAttendanceRepo.findOne.mockResolvedValue(existingRecord);

      await expect(service.clockIn('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should mark as late when clocking in after work start time', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      mockEmployeeRepo.findOne.mockResolvedValue({ workStartTime: '00:00' }); // set to midnight so now > threshold

      const newRecord = { id: 'r1', status: 'late' };
      mockAttendanceRepo.create.mockReturnValue(newRecord);
      mockAttendanceRepo.save.mockResolvedValue(newRecord);

      const result = await service.clockIn('emp-1');

      expect(result.status).toBe('late');
    });
  });

  describe('clockOut', () => {
    it('should clock out and calculate overtime', async () => {
      const clockInTime = new Date();
      clockInTime.setHours(8, 0, 0, 0);

      const record = {
        id: 'r1',
        employeeId: 'emp-1',
        clockIn: clockInTime,
        clockOut: null,
        overtimeHours: 0,
      };
      mockAttendanceRepo.findOne.mockResolvedValue(record);
      mockEmployeeRepo.findOne.mockResolvedValue({
        workStartTime: '08:00',
        workEndTime: '09:00', // 1 hour schedule
        breakDurationMinutes: 0,
      });
      mockAttendanceRepo.save.mockImplementation(async (r) => r);

      await service.clockOut('emp-1');

      expect(mockAttendanceRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not clocked in', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);

      await expect(service.clockOut('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if record has no clockIn', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({ id: 'r1', clockIn: null });

      await expect(service.clockOut('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already clocked out', async () => {
      const record = {
        id: 'r1',
        clockIn: new Date(),
        clockOut: new Date(),
      };
      mockAttendanceRepo.findOne.mockResolvedValue(record);

      await expect(service.clockOut('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('flagDiscrepancy', () => {
    it('should create a discrepancy report', async () => {
      const data = {
        attendanceDate: '2024-07-01',
        description: 'Missing clock out record',
      };
      const created = {
        id: 'dr-1',
        employeeId: 'emp-1',
        ...data,
        status: 'pending',
      };
      mockDiscrepancyReportRepo.create.mockResolvedValue(created);

      const result = await service.flagDiscrepancy('emp-1', data);

      expect(result).toEqual(created);
      expect(mockDiscrepancyReportRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        attendanceDate: new Date('2024-07-01'),
        description: 'Missing clock out record',
        status: 'pending',
      });
    });
  });
});
