import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MyLeaveService } from './my-leave.service';
import {
  LEAVE_TYPE_REPOSITORY,
  LEAVE_BALANCE_REPOSITORY,
  LEAVE_REQUEST_REPOSITORY,
} from '../../domain/repositories/self-service-repository.port';

describe('MyLeaveService', () => {
  let service: MyLeaveService;

  const mockLeaveTypeRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActive: jest.fn(),
  };

  const mockLeaveBalanceRepo = {
    findByEmployeeAndYear: jest.fn(),
    findByEmployeeTypeAndYear: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockLeaveRequestRepo = {
    create: jest.fn(),
    findByEmployeeId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findPendingByApprover: jest.fn(),
    findPending: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn().mockReturnValue({
      create: jest.fn((data) => data),
      save: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyLeaveService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: LEAVE_TYPE_REPOSITORY, useValue: mockLeaveTypeRepo },
        { provide: LEAVE_BALANCE_REPOSITORY, useValue: mockLeaveBalanceRepo },
        { provide: LEAVE_REQUEST_REPOSITORY, useValue: mockLeaveRequestRepo },
      ],
    }).compile();

    service = module.get(MyLeaveService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLeaveBalance', () => {
    it('should return leave balances for employee and year', async () => {
      const balances = [
        { id: 'bal-1', leaveTypeId: 'lt-1', remainingDays: 10, usedDays: 5 },
        { id: 'bal-2', leaveTypeId: 'lt-2', remainingDays: 3, usedDays: 2 },
      ];
      mockLeaveBalanceRepo.findByEmployeeAndYear.mockResolvedValue(balances);

      const result = await service.getLeaveBalance('emp-1', 2024);

      expect(result).toEqual(balances);
      expect(mockLeaveBalanceRepo.findByEmployeeAndYear).toHaveBeenCalledWith(
        'emp-1',
        2024,
      );
    });
  });

  describe('getLeaveHistory', () => {
    it('should return leave history with filters', async () => {
      const requests = [{ id: 'req-1', status: 'approved' }];
      mockLeaveRequestRepo.findByEmployeeId.mockResolvedValue(requests);

      const result = await service.getLeaveHistory('emp-1', {
        status: 'approved',
        year: 2024,
      });

      expect(result).toEqual(requests);
      expect(mockLeaveRequestRepo.findByEmployeeId).toHaveBeenCalledWith(
        'emp-1',
        { status: 'approved', year: 2024 },
      );
    });

    it('should return leave history without filters', async () => {
      mockLeaveRequestRepo.findByEmployeeId.mockResolvedValue([]);

      const result = await service.getLeaveHistory('emp-1');

      expect(result).toEqual([]);
      expect(mockLeaveRequestRepo.findByEmployeeId).toHaveBeenCalledWith(
        'emp-1',
        undefined,
      );
    });
  });

  describe('applyLeave', () => {
    const baseApplyData = {
      leaveTypeId: 'lt-1',
      startDate: '2024-07-01',
      endDate: '2024-07-05',
      reason: 'Vacation',
    };

    it('should apply leave without deducting balance', async () => {
      const leaveType = { id: 'lt-1', name: 'Annual Leave' };
      const balance = { id: 'bal-1', remainingDays: 10, usedDays: 0 };

      mockLeaveTypeRepo.findById.mockResolvedValue(leaveType);
      mockLeaveBalanceRepo.findByEmployeeTypeAndYear.mockResolvedValue(balance);
      const createdRequest = {
        id: 'req-1',
        ...baseApplyData,
        status: 'pending',
        workingDays: 5,
      };
      mockLeaveRequestRepo.create.mockResolvedValue(createdRequest);

      const result = await service.applyLeave('emp-1', baseApplyData);

      expect(result).toEqual(createdRequest);
      // Balance should NOT be deducted on apply (only on approval)
      expect(mockLeaveBalanceRepo.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if leave type not found', async () => {
      mockLeaveTypeRepo.findById.mockResolvedValue(null);

      await expect(service.applyLeave('emp-1', baseApplyData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if end date before start date', async () => {
      const leaveType = { id: 'lt-1', name: 'Annual Leave' };
      mockLeaveTypeRepo.findById.mockResolvedValue(leaveType);

      await expect(
        service.applyLeave('emp-1', {
          ...baseApplyData,
          startDate: '2024-07-05',
          endDate: '2024-07-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no leave balance found', async () => {
      const leaveType = { id: 'lt-1', name: 'Annual Leave' };
      mockLeaveTypeRepo.findById.mockResolvedValue(leaveType);
      mockLeaveBalanceRepo.findByEmployeeTypeAndYear.mockResolvedValue(null);

      await expect(service.applyLeave('emp-1', baseApplyData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      const leaveType = { id: 'lt-1', name: 'Annual Leave' };
      const balance = { id: 'bal-1', remainingDays: 2, usedDays: 8 };

      mockLeaveTypeRepo.findById.mockResolvedValue(leaveType);
      mockLeaveBalanceRepo.findByEmployeeTypeAndYear.mockResolvedValue(balance);

      await expect(service.applyLeave('emp-1', baseApplyData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include attachmentPath when provided', async () => {
      const leaveType = { id: 'lt-1', name: 'Sick Leave' };
      const balance = { id: 'bal-1', remainingDays: 10, usedDays: 0 };

      mockLeaveTypeRepo.findById.mockResolvedValue(leaveType);
      mockLeaveBalanceRepo.findByEmployeeTypeAndYear.mockResolvedValue(balance);
      mockLeaveRequestRepo.create.mockResolvedValue({ id: 'req-1' });
      mockLeaveBalanceRepo.update.mockResolvedValue({});

      await service.applyLeave('emp-1', {
        ...baseApplyData,
        leaveTypeId: 'lt-1',
        attachmentPath: '/uploads/mc.pdf',
      });

      const createCall = mockLeaveRequestRepo.create.mock.calls[0][0];
      expect(createCall.attachmentPath).toBe('/uploads/mc.pdf');
    });
  });

  describe('cancelLeave', () => {
    it('should cancel a pending leave request without restoring balance', async () => {
      const leaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2024-07-01'),
        workingDays: 5,
        status: 'pending',
      };

      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: 'cancelled',
      });

      const result = await service.cancelLeave('emp-1', 'req-1');

      // Balance should NOT be restored since it was never deducted (pending status)
      expect(mockLeaveBalanceRepo.update).not.toHaveBeenCalled();
      expect(mockLeaveRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: 'cancelled',
      });
    });

    it('should throw NotFoundException if leave request not found', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(null);

      await expect(
        service.cancelLeave('emp-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if employee does not own the request', async () => {
      const leaveRequest = {
        id: 'req-1',
        employeeId: 'other-emp',
        status: 'pending',
      };
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      await expect(service.cancelLeave('emp-1', 'req-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cancel an approved leave and restore balance', async () => {
      const leaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2024-07-01'),
        workingDays: 5,
        status: 'approved',
      };
      const balance = { id: 'bal-1', usedDays: 5, remainingDays: 5 };

      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveBalanceRepo.findByEmployeeTypeAndYear.mockResolvedValue(balance);
      mockLeaveBalanceRepo.update.mockResolvedValue({});
      mockLeaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: 'cancelled',
      });

      await service.cancelLeave('emp-1', 'req-1');

      // Balance should be restored since it was deducted on approval
      expect(mockLeaveBalanceRepo.update).toHaveBeenCalledWith('bal-1', {
        usedDays: 0,
        remainingDays: 10,
      });
    });

    it('should handle missing balance gracefully when cancelling', async () => {
      const leaveRequest = {
        id: 'req-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2024-07-01'),
        workingDays: 5,
        status: 'pending',
      };
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveBalanceRepo.findByEmployeeTypeAndYear.mockResolvedValue(null);
      mockLeaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: 'cancelled',
      });

      await service.cancelLeave('emp-1', 'req-1');

      expect(mockLeaveBalanceRepo.update).not.toHaveBeenCalled();
      expect(mockLeaveRequestRepo.update).toHaveBeenCalledWith('req-1', {
        status: 'cancelled',
      });
    });
  });
});
