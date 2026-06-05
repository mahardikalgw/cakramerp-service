import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { ATTENDANCE_REPOSITORY } from '../../domain/repositories/attendance-repository.port';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port';
import { RecordAttendanceCommand } from '../commands/record-attendance.command';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepo: any;
  let employeeRepo: any;

  beforeEach(async () => {
    attendanceRepo = {
      findByEmployeeIdsAndMonth: jest.fn(),
      findByEmployeeAndDate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getOvertimeHours: jest.fn(),
    };
    employeeRepo = {
      findActiveEmployees: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: ATTENDANCE_REPOSITORY, useValue: attendanceRepo },
        { provide: EMPLOYEE_REPOSITORY, useValue: employeeRepo },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('getMonthlyGrid', () => {
    it('should return grid with attendance data per employee per day', async () => {
      const employees = [
        { id: 'emp-1', fullName: 'John Doe', employeeNumber: 'EMP-001' },
      ];
      const records = [
        {
          employeeId: 'emp-1',
          date: new Date('2024-03-01'),
          status: 'present',
          clockIn: new Date('2024-03-01T08:00:00'),
          clockOut: new Date('2024-03-01T17:00:00'),
          overtimeHours: 1,
        },
      ];

      employeeRepo.findActiveEmployees.mockResolvedValue(employees);
      attendanceRepo.findByEmployeeIdsAndMonth.mockResolvedValue(records);

      const result = await service.getMonthlyGrid(3, 2024);

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[0].employeeName).toBe('John Doe');
      expect(result[0].days).toHaveLength(31);
      expect(result[0].days[0].status).toBe('present');
      expect(result[0].days[0].overtimeHours).toBe(1);
      expect(result[0].days[1].status).toBe('-');
    });

    it('should return empty array when no employees found', async () => {
      employeeRepo.findActiveEmployees.mockResolvedValue([]);

      const result = await service.getMonthlyGrid(3, 2024);

      expect(result).toEqual([]);
      expect(attendanceRepo.findByEmployeeIdsAndMonth).not.toHaveBeenCalled();
    });

    it('should pass siteId and departmentId to findActiveEmployees', async () => {
      employeeRepo.findActiveEmployees.mockResolvedValue([]);

      await service.getMonthlyGrid(3, 2024, 'site-1', 'dept-1');

      expect(employeeRepo.findActiveEmployees).toHaveBeenCalledWith(
        'site-1',
        'dept-1',
      );
    });

    it('should handle records with null clockIn/clockOut', async () => {
      const employees = [
        { id: 'emp-1', fullName: 'John', employeeNumber: 'E001' },
      ];
      const records = [
        {
          employeeId: 'emp-1',
          date: new Date('2024-03-01'),
          status: 'absent',
          clockIn: null,
          clockOut: null,
          overtimeHours: 0,
        },
      ];

      employeeRepo.findActiveEmployees.mockResolvedValue(employees);
      attendanceRepo.findByEmployeeIdsAndMonth.mockResolvedValue(records);

      const result = await service.getMonthlyGrid(3, 2024);

      expect(result[0].days[0].clockIn).toBeUndefined();
      expect(result[0].days[0].clockOut).toBeUndefined();
    });
  });

  describe('getSummary', () => {
    it('should calculate present, absent, late days and overtime', async () => {
      const employees = [
        { id: 'emp-1', fullName: 'John', employeeNumber: 'E001' },
      ];
      const records = [
        { employeeId: 'emp-1', status: 'present', overtimeHours: 2 },
        { employeeId: 'emp-1', status: 'present', overtimeHours: 1 },
        { employeeId: 'emp-1', status: 'late', overtimeHours: 0 },
        { employeeId: 'emp-1', status: 'absent', overtimeHours: 0 },
      ];

      employeeRepo.findActiveEmployees.mockResolvedValue(employees);
      attendanceRepo.findByEmployeeIdsAndMonth.mockResolvedValue(records);

      const result = await service.getSummary(3, 2024);

      expect(result).toHaveLength(1);
      expect(result[0].presentDays).toBe(2);
      expect(result[0].absentDays).toBe(1);
      expect(result[0].lateDays).toBe(1);
      expect(result[0].overtimeHours).toBe(3);
    });

    it('should return empty array when no employees found', async () => {
      employeeRepo.findActiveEmployees.mockResolvedValue([]);

      const result = await service.getSummary(3, 2024);

      expect(result).toEqual([]);
    });
  });

  describe('recordAttendance', () => {
    it('should create new attendance record when none exists', async () => {
      const command = new RecordAttendanceCommand(
        'emp-1',
        '2024-03-01',
        '08:00',
        '17:00',
        'present',
        'On time',
      );
      const created = { id: 'att-1', status: 'present' };

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue(null);
      attendanceRepo.create.mockResolvedValue(created);

      const result = await service.recordAttendance(command);

      expect(result).toEqual(created);
      expect(attendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          date: new Date('2024-03-01'),
          status: 'present',
          absenceReason: 'On time',
          isImported: false,
          overtimeHours: 0,
        }),
      );
    });

    it('should update existing attendance record', async () => {
      const command = new RecordAttendanceCommand(
        'emp-1',
        '2024-03-01',
        '09:00',
        '18:00',
        'late',
      );
      const existing = {
        id: 'att-1',
        clockIn: new Date('2024-03-01T08:00:00'),
      };
      const updated = { id: 'att-1', status: 'late' };

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue(existing);
      attendanceRepo.update.mockResolvedValue(updated);

      const result = await service.recordAttendance(command);

      expect(result).toEqual(updated);
      expect(attendanceRepo.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          status: 'late',
        }),
      );
    });

    it('should default status to present when not provided', async () => {
      const command = new RecordAttendanceCommand(
        'emp-1',
        '2024-03-01',
        '08:00',
        '17:00',
      );

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue(null);
      attendanceRepo.create.mockResolvedValue({});

      await service.recordAttendance(command);

      expect(attendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'present',
        }),
      );
    });

    it('should parse ISO time strings for clockIn/clockOut', async () => {
      const command = new RecordAttendanceCommand(
        'emp-1',
        '2024-03-01',
        '2024-03-01T08:30:00',
        '2024-03-01T17:30:00',
      );

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue(null);
      attendanceRepo.create.mockResolvedValue({});

      await service.recordAttendance(command);

      expect(attendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clockIn: new Date('2024-03-01T08:30:00'),
          clockOut: new Date('2024-03-01T17:30:00'),
        }),
      );
    });

    it('should use existing clockIn/clockOut when command values are undefined on update', async () => {
      const existingClockIn = new Date('2024-03-01T08:00:00');
      const existingClockOut = new Date('2024-03-01T17:00:00');
      const command = new RecordAttendanceCommand(
        'emp-1',
        '2024-03-01',
        undefined,
        undefined,
        'late',
      );
      const existing = {
        id: 'att-1',
        clockIn: existingClockIn,
        clockOut: existingClockOut,
        absenceReason: 'reason',
      };

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue(existing);
      attendanceRepo.update.mockResolvedValue({});

      await service.recordAttendance(command);

      expect(attendanceRepo.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          clockIn: existingClockIn,
          clockOut: existingClockOut,
          absenceReason: 'reason',
        }),
      );
    });
  });

  describe('importCsv', () => {
    it('should import CSV lines and count flagged late arrivals', async () => {
      const lines = [
        {
          employeeId: 'emp-1',
          date: '2024-03-01',
          clockIn: '2024-03-01T07:50:00',
          clockOut: '2024-03-01T17:00:00',
        },
        {
          employeeId: 'emp-2',
          date: '2024-03-01',
          clockIn: '2024-03-01T08:30:00',
          clockOut: '2024-03-01T17:00:00',
        },
        {
          employeeId: 'emp-3',
          date: '2024-03-01',
          clockIn: '2024-03-01T08:01:00',
          clockOut: '2024-03-01T17:00:00',
        },
      ];

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue(null);
      attendanceRepo.create.mockResolvedValue({});

      const result = await service.importCsv(lines);

      expect(result.imported).toBe(3);
      expect(result.flaggedLate).toBe(2);
      expect(attendanceRepo.create).toHaveBeenCalledTimes(3);
    });

    it('should update existing records during import', async () => {
      const lines = [
        {
          employeeId: 'emp-1',
          date: '2024-03-01',
          clockIn: '2024-03-01T08:00:00',
          clockOut: '2024-03-01T17:00:00',
        },
      ];

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue({
        id: 'existing-att',
      });
      attendanceRepo.update.mockResolvedValue({});

      const result = await service.importCsv(lines);

      expect(result.imported).toBe(1);
      expect(result.flaggedLate).toBe(0);
      expect(attendanceRepo.update).toHaveBeenCalledWith(
        'existing-att',
        expect.objectContaining({
          isImported: true,
        }),
      );
    });

    it('should mark late when clockIn is after 08:00', async () => {
      const lines = [
        {
          employeeId: 'emp-1',
          date: '2024-03-01',
          clockIn: '2024-03-01T07:59:00',
          clockOut: '2024-03-01T17:00:00',
        },
        {
          employeeId: 'emp-2',
          date: '2024-03-01',
          clockIn: '2024-03-01T08:01:00',
          clockOut: '2024-03-01T17:00:00',
        },
      ];

      attendanceRepo.findByEmployeeAndDate.mockResolvedValue(null);
      attendanceRepo.create.mockResolvedValue({});

      await service.importCsv(lines);

      expect(attendanceRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ status: 'present' }),
      );
      expect(attendanceRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ status: 'late' }),
      );
    });
  });

  describe('exportReport', () => {
    it('should generate CSV string with attendance data', async () => {
      const employees = [
        { id: 'emp-1', fullName: 'John Doe', employeeNumber: 'E001' },
      ];
      const records = [
        {
          employeeId: 'emp-1',
          date: new Date('2024-03-01'),
          clockIn: new Date('2024-03-01T08:00:00'),
          clockOut: new Date('2024-03-01T17:00:00'),
          status: 'present',
          overtimeHours: 1,
          absenceReason: null,
        },
      ];

      employeeRepo.findActiveEmployees.mockResolvedValue(employees);
      attendanceRepo.findByEmployeeIdsAndMonth.mockResolvedValue(records);

      const result = await service.exportReport(3, 2024);

      expect(result).toContain('Employee Number');
      expect(result).toContain('E001');
      expect(result).toContain('"John Doe"');
      expect(result).toContain('present');
    });

    it('should return empty string when no employees found', async () => {
      employeeRepo.findActiveEmployees.mockResolvedValue([]);

      const result = await service.exportReport(3, 2024);

      expect(result).toBe('');
    });
  });
});
