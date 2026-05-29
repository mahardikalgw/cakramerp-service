import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoleService } from './role.service';
import { ROLE_REPOSITORY } from '../../domain/repositories/role-repository.port';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/permission-repository.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { AUDIT_LOG_SERVICE } from '../../../audit/application/ports/audit-log-service.port';
import { Role } from '../../domain/entities/role.entity';
import { Permission } from '../../domain/entities/permission.entity';
import { CreateRoleCommand } from '../commands/create-role.command';
import { AssignRoleCommand } from '../commands/assign-role.command';
import { UpdateRolePermissionsCommand } from '../commands/update-role-permissions.command';

describe('RoleService', () => {
  let service: RoleService;

  const mockRoleRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findByName: jest.fn(),
    findByNameWithPermissions: jest.fn(),
  };

  const mockPermissionRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findByName: jest.fn(),
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
        RoleService,
        { provide: ROLE_REPOSITORY, useValue: mockRoleRepository },
        { provide: PERMISSION_REPOSITORY, useValue: mockPermissionRepository },
        { provide: USER_ROLE_ASSIGNER_PORT, useValue: mockUserRoleAssigner },
        { provide: AUDIT_LOG_SERVICE, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get(RoleService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated roles', async () => {
      const expectedResult = {
        data: [new Role({ id: '1', name: 'Admin' })],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      };
      mockRoleRepository.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(expectedResult);
      expect(mockRoleRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should use default pagination values', async () => {
      const expectedResult = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      };
      mockRoleRepository.findAll.mockResolvedValue(expectedResult);

      await service.findAll();

      expect(mockRoleRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  describe('findById', () => {
    it('should return a role by id', async () => {
      const role = new Role({ id: 'role-1', name: 'Admin' });
      mockRoleRepository.findById.mockResolvedValue(role);

      const result = await service.findById('role-1');

      expect(result).toEqual(role);
      expect(mockRoleRepository.findById).toHaveBeenCalledWith('role-1');
    });

    it('should throw NotFoundException if role not found', async () => {
      mockRoleRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    it('should return a role by name with permissions', async () => {
      const permission = new Permission({ id: 'perm-1', name: 'Read Users', resource: 'users', action: 'read' });
      const role = new Role({ id: 'role-1', name: 'Admin', permissions: [permission] });
      mockRoleRepository.findByNameWithPermissions.mockResolvedValue(role);

      const result = await service.findByName('Admin');

      expect(result).toEqual(role);
      expect(mockRoleRepository.findByNameWithPermissions).toHaveBeenCalledWith('Admin');
    });

    it('should throw NotFoundException if role not found by name', async () => {
      mockRoleRepository.findByNameWithPermissions.mockResolvedValue(null);

      await expect(service.findByName('NonExistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a role with valid permissions', async () => {
      const command = new CreateRoleCommand('Manager', 'Manager role', ['perm-1', 'perm-2']);
      const perm1 = new Permission({ id: 'perm-1', name: 'Read', resource: 'users', action: 'read' });
      const perm2 = new Permission({ id: 'perm-2', name: 'Write', resource: 'users', action: 'write' });

      mockPermissionRepository.findById.mockResolvedValueOnce(perm1).mockResolvedValueOnce(perm2);
      const savedRole = new Role({ id: 'role-1', name: 'Manager', description: 'Manager role', permissions: [perm1, perm2] });
      mockRoleRepository.save.mockResolvedValue(savedRole);

      const result = await service.create(command);

      expect(mockPermissionRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockRoleRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Manager');
    });

    it('should filter out null permissions when creating role', async () => {
      const command = new CreateRoleCommand('Manager', 'Manager role', ['perm-1', 'invalid-perm']);
      const perm1 = new Permission({ id: 'perm-1', name: 'Read', resource: 'users', action: 'read' });

      mockPermissionRepository.findById.mockResolvedValueOnce(perm1).mockResolvedValueOnce(null);
      const savedRole = new Role({ id: 'role-1', name: 'Manager', permissions: [perm1] });
      mockRoleRepository.save.mockResolvedValue(savedRole);

      const result = await service.create(command);

      expect(result.permissions).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('should delete a role', async () => {
      mockRoleRepository.delete.mockResolvedValue(true);

      await service.delete('role-1');

      expect(mockRoleRepository.delete).toHaveBeenCalledWith('role-1');
    });

    it('should throw NotFoundException if role not found on delete', async () => {
      mockRoleRepository.delete.mockResolvedValue(false);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRolesToUser', () => {
    it('should assign valid roles to user', async () => {
      const command = new AssignRoleCommand('user-1', ['role-1', 'role-2']);
      const role1 = new Role({ id: 'role-1', name: 'Admin' });
      const role2 = new Role({ id: 'role-2', name: 'Manager' });

      mockRoleRepository.findById.mockResolvedValueOnce(role1).mockResolvedValueOnce(role2);
      mockUserRoleAssigner.assignRoles.mockResolvedValue(undefined);

      await service.assignRolesToUser(command);

      expect(mockUserRoleAssigner.assignRoles).toHaveBeenCalledWith('user-1', ['role-1', 'role-2']);
    });

    it('should throw NotFoundException if some roles not found', async () => {
      const command = new AssignRoleCommand('user-1', ['role-1', 'invalid-role']);
      const role1 = new Role({ id: 'role-1', name: 'Admin' });

      mockRoleRepository.findById.mockResolvedValueOnce(role1).mockResolvedValueOnce(null);

      await expect(service.assignRolesToUser(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePermissions', () => {
    it('should update role permissions', async () => {
      const command = new UpdateRolePermissionsCommand('role-1', ['perm-1', 'perm-3']);
      const role = new Role({ id: 'role-1', name: 'Admin', permissions: [] });
      const perm1 = new Permission({ id: 'perm-1', name: 'Read', resource: 'users', action: 'read' });
      const perm3 = new Permission({ id: 'perm-3', name: 'Delete', resource: 'users', action: 'delete' });

      mockRoleRepository.findById.mockResolvedValue(role);
      mockPermissionRepository.findById.mockResolvedValueOnce(perm1).mockResolvedValueOnce(perm3);
      mockRoleRepository.save.mockResolvedValue(role);

      const result = await service.updatePermissions(command);

      expect(result.permissions).toHaveLength(2);
      expect(mockRoleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if role not found when updating permissions', async () => {
      const command = new UpdateRolePermissionsCommand('non-existent', ['perm-1']);
      mockRoleRepository.findById.mockResolvedValue(null);

      await expect(service.updatePermissions(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('logAuditAction', () => {
    it('should log an audit action', async () => {
      mockAuditLogService.create.mockResolvedValue({});

      await service.logAuditAction({
        userId: 'user-1',
        action: 'create',
        module: 'iam',
        recordId: 'role-1',
        payload: { name: 'Admin' },
      });

      expect(mockAuditLogService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        userName: '',
        action: 'create',
        module: 'iam',
        recordId: 'role-1',
        ipAddress: '',
        payload: { name: 'Admin' },
      });
    });
  });
});
