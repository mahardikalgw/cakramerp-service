import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { AUDIT_LOG_REPOSITORY } from '../../domain/repositories/audit-log-repository.port';
import { AuditLog, AuditAction } from '../../domain/entities/audit-log.entity';
import { CreateAuditLogCommand } from '../commands/create-audit-log.command';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockRepo = {
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByUserId: jest.fn(),
    findByModule: jest.fn(),
    findByAction: jest.fn(),
    findByDateRange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: AUDIT_LOG_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(AuditLogService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const command = new CreateAuditLogCommand(
        'user1',
        'John Doe',
        'create',
        'customer',
        'rec1',
        '127.0.0.1',
        { name: 'Test' },
      );
      const saved = new AuditLog({
        id: '1',
        userId: 'user1',
        userName: 'John Doe',
        action: AuditAction.CREATE,
        module: 'customer',
        recordId: 'rec1',
        ipAddress: '127.0.0.1',
        payload: { name: 'Test' },
      });
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.create(command);

      expect(result).toEqual(saved);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      const savedEntity = mockRepo.save.mock.calls[0][0];
      expect(savedEntity.userId).toBe('user1');
      expect(savedEntity.userName).toBe('John Doe');
      expect(savedEntity.action).toBe('create');
      expect(savedEntity.module).toBe('customer');
    });
  });

  describe('findAll', () => {
    it('should return all audit logs', async () => {
      const expected = {
        data: [{ id: '1', action: 'create' }],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should call findAll without options', async () => {
      const expected = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findByUserId', () => {
    it('should return audit logs by user id', async () => {
      const expected = {
        data: [{ id: '1', userId: 'user1' }],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findByUserId.mockResolvedValue(expected);

      const result = await service.findByUserId('user1', { page: 1 });

      expect(result).toEqual(expected);
      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user1', { page: 1 });
    });
  });

  describe('findByModule', () => {
    it('should return audit logs by module', async () => {
      const expected = {
        data: [{ id: '1', module: 'customer' }],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findByModule.mockResolvedValue(expected);

      const result = await service.findByModule('customer');

      expect(result).toEqual(expected);
      expect(mockRepo.findByModule).toHaveBeenCalledWith('customer', undefined);
    });
  });

  describe('findByAction', () => {
    it('should return audit logs by action', async () => {
      const expected = {
        data: [{ id: '1', action: 'create' }],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findByAction.mockResolvedValue(expected);

      const result = await service.findByAction('create');

      expect(result).toEqual(expected);
      expect(mockRepo.findByAction).toHaveBeenCalledWith('create', undefined);
    });
  });

  describe('findByDateRange', () => {
    it('should return audit logs by date range', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const expected = {
        data: [{ id: '1' }],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findByDateRange.mockResolvedValue(expected);

      const result = await service.findByDateRange(start, end, { page: 1 });

      expect(result).toEqual(expected);
      expect(mockRepo.findByDateRange).toHaveBeenCalledWith(start, end, {
        page: 1,
      });
    });
  });

  describe('exportToExcel', () => {
    it('should export audit logs to excel buffer', async () => {
      const logs = {
        data: [
          {
            id: '1',
            userName: 'John',
            action: 'create',
            module: 'customer',
            recordId: 'rec1',
            ipAddress: '127.0.0.1',
            createdAt: new Date('2024-06-01T10:00:00Z'),
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findAll.mockResolvedValue(logs);

      const result = await service.exportToExcel();

      expect(Buffer.isBuffer(result)).toBe(true);
      const content = result.toString('utf-8');
      expect(content).toContain(
        'ID\tUser\tAction\tModule\tRecord ID\tIP Address\tTimestamp',
      );
      expect(content).toContain('John');
      expect(content).toContain('create');
      expect(content).toContain('customer');
    });

    it('should handle empty data', async () => {
      mockRepo.findAll.mockResolvedValue({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      const result = await service.exportToExcel();

      expect(Buffer.isBuffer(result)).toBe(true);
      const content = result.toString('utf-8');
      expect(content).toContain('ID\tUser\tAction\tModule');
    });

    it('should handle null recordId and ipAddress', async () => {
      const logs = {
        data: [
          {
            id: '1',
            userName: 'John',
            action: 'login',
            module: 'auth',
            recordId: null,
            ipAddress: null,
            createdAt: new Date('2024-06-01T10:00:00Z'),
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findAll.mockResolvedValue(logs);

      const result = await service.exportToExcel();

      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe('exportToPdf', () => {
    it('should export audit logs to pdf buffer', async () => {
      const logs = {
        data: [
          {
            id: '1',
            userName: 'John',
            action: 'create',
            module: 'customer',
            recordId: 'rec1',
            createdAt: new Date('2024-06-01T10:00:00Z'),
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findAll.mockResolvedValue(logs);

      const result = await service.exportToPdf();

      expect(Buffer.isBuffer(result)).toBe(true);
      const content = result.toString('utf-8');
      expect(content).toContain('AUDIT LOG REPORT');
      expect(content).toContain('John');
      expect(content).toContain('create');
      expect(content).toContain('Total Records: 1');
    });

    it('should handle empty data in pdf export', async () => {
      mockRepo.findAll.mockResolvedValue({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      const result = await service.exportToPdf();

      expect(Buffer.isBuffer(result)).toBe(true);
      const content = result.toString('utf-8');
      expect(content).toContain('AUDIT LOG REPORT');
      expect(content).toContain('Total Records: 0');
    });

    it('should handle null recordId in pdf export', async () => {
      const logs = {
        data: [
          {
            id: '1',
            userName: 'John',
            action: 'login',
            module: 'auth',
            recordId: null,
            createdAt: new Date('2024-06-01T10:00:00Z'),
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockRepo.findAll.mockResolvedValue(logs);

      const result = await service.exportToPdf();

      const content = result.toString('utf-8');
      expect(content).toContain('-');
    });
  });
});
