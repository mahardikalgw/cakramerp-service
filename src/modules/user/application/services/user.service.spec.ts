import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { UserService } from './user.service';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { AUDIT_LOG_SERVICE } from '../../../audit/application/ports/audit-log-service.port';
import { User, UserStatus } from '../../domain/entities/user.entity';
import { CreateUserCommand } from '../commands/create-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';
import { ChangePasswordCommand } from '../commands/change-password.command';

jest.mock('bcryptjs');

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserRoleAssigner = {
    assignRoles: jest.fn(),
  };

  const mockAuditLogService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: USER_ROLE_ASSIGNER_PORT, useValue: mockUserRoleAssigner },
        { provide: AUDIT_LOG_SERVICE, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const expectedResult = {
        data: [new User({ id: '1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' })],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      };
      mockUserRepository.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(expectedResult);
      expect(mockUserRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, filters: {} });
    });

    it('should pass status and role filters', async () => {
      const expectedResult = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      };
      mockUserRepository.findAll.mockResolvedValue(expectedResult);

      await service.findAll(1, 20, 'active', 'admin');

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: { status: 'active', role: 'admin' },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' });
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await service.findById('user-1');

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' });
      mockUserRepository.findByEmail.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found by email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(service.findByEmail('unknown@example.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a user and return it', async () => {
      const command = new CreateUserCommand('test@example.com', 'Pass123!', 'John', 'Doe');
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-password');
      const savedUser = new User({
        id: 'user-1',
        email: command.email,
        passwordHash: 'hashed-password',
        firstName: command.firstName,
        lastName: command.lastName,
      });
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(command);

      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcryptjs.hash).toHaveBeenCalledWith('Pass123!', 12);
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ConflictException if email already exists', async () => {
      const command = new CreateUserCommand('existing@example.com', 'Pass123!', 'John', 'Doe');
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      await expect(service.create(command)).rejects.toThrow(ConflictException);
    });

    it('should assign roles if roleIds provided', async () => {
      const command = new CreateUserCommand('test@example.com', 'Pass123!', 'John', 'Doe', ['role-1', 'role-2']);
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-password');
      const savedUser = new User({ id: 'user-1', email: command.email, passwordHash: 'hashed-password', firstName: 'John', lastName: 'Doe' });
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockUserRoleAssigner.assignRoles.mockResolvedValue(undefined);

      await service.create(command);

      expect(mockUserRoleAssigner.assignRoles).toHaveBeenCalledWith('user-1', ['role-1', 'role-2']);
    });

    it('should set correct status from command', async () => {
      const command = new CreateUserCommand('test@example.com', 'Pass123!', 'John', 'Doe', undefined, 'inactive');
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-password');
      const savedUser = new User({ id: 'user-1', email: command.email, passwordHash: 'hashed-password', firstName: 'John', lastName: 'Doe', status: UserStatus.INACTIVE });
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(command);

      expect(result.status).toBe(UserStatus.INACTIVE);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' });
      mockUserRepository.findById.mockResolvedValue(user);
      const updatedUser = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'Jane', lastName: 'Smith' });
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const command = new UpdateUserCommand('Jane', 'Smith');
      const result = await service.update('user-1', command);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      const command = new UpdateUserCommand('Jane');

      await expect(service.update('non-existent', command)).rejects.toThrow(NotFoundException);
    });

    it('should activate user when status is active', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe', status: UserStatus.INACTIVE });
      user.activate = jest.fn();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const command = new UpdateUserCommand(undefined, undefined, 'active');
      await service.update('user-1', command);

      expect(user.activate).toHaveBeenCalled();
    });

    it('should deactivate user when status is inactive', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' });
      user.deactivate = jest.fn();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const command = new UpdateUserCommand(undefined, undefined, 'inactive');
      await service.update('user-1', command);

      expect(user.deactivate).toHaveBeenCalled();
    });

    it('should assign roles when roleIds provided', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' });
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);
      mockUserRoleAssigner.assignRoles.mockResolvedValue(undefined);

      const command = new UpdateUserCommand(undefined, undefined, undefined, ['role-1']);
      await service.update('user-1', command);

      expect(mockUserRoleAssigner.assignRoles).toHaveBeenCalledWith('user-1', ['role-1']);
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'old-hash', firstName: 'John', lastName: 'Doe' });
      mockUserRepository.findById.mockResolvedValue(user);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUserRepository.save.mockResolvedValue(user);

      const command = new ChangePasswordCommand('user-1', 'NewPass123!');
      await service.changePassword(command);

      expect(bcryptjs.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(user.passwordHash).toBe('new-hashed-password');
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const command = new ChangePasswordCommand('non-existent', 'NewPass123!');
      await expect(service.changePassword(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should deactivate user instead of deleting', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' });
      user.deactivate = jest.fn();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      await service.delete('user-1');

      expect(user.deactivate).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user', async () => {
      const user = new User({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', firstName: 'John', lastName: 'Doe' });
      user.deactivate = jest.fn();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      await service.deactivate('user-1');

      expect(user.deactivate).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('logAuditAction', () => {
    it('should log an audit action', async () => {
      mockAuditLogService.create.mockResolvedValue({});

      await service.logAuditAction({
        userId: 'user-1',
        action: 'create',
        module: 'user',
        recordId: 'user-1',
        payload: { email: 'test@example.com' },
      });

      expect(mockAuditLogService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        userName: '',
        action: 'create',
        module: 'user',
        recordId: 'user-1',
        ipAddress: '',
        payload: { email: 'test@example.com' },
      });
    });
  });
});
