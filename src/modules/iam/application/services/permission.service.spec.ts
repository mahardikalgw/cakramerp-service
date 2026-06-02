import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/permission-repository.port';
import { Permission } from '../../domain/entities/permission.entity';
import { CreatePermissionCommand } from '../commands/create-permission.command';

describe('PermissionService', () => {
  let service: PermissionService;

  const mockPermissionRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PERMISSION_REPOSITORY, useValue: mockPermissionRepository },
      ],
    }).compile();

    service = module.get(PermissionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated permissions', async () => {
      const expectedResult = {
        data: [
          new Permission({
            id: '1',
            name: 'Read Users',
            resource: 'users',
            action: 'read',
          }),
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockPermissionRepository.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(expectedResult);
      expect(mockPermissionRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('should use default pagination when no args provided', async () => {
      const expectedResult = {
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mockPermissionRepository.findAll.mockResolvedValue(expectedResult);

      await service.findAll();

      expect(mockPermissionRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findById', () => {
    it('should return a permission by id', async () => {
      const permission = new Permission({
        id: 'perm-1',
        name: 'Read Users',
        resource: 'users',
        action: 'read',
      });
      mockPermissionRepository.findById.mockResolvedValue(permission);

      const result = await service.findById('perm-1');

      expect(result).toEqual(permission);
      expect(mockPermissionRepository.findById).toHaveBeenCalledWith('perm-1');
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPermissionRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a permission', async () => {
      const command = new CreatePermissionCommand(
        'Create User',
        'users',
        'create',
      );
      const savedPermission = new Permission({
        id: 'perm-1',
        name: 'Create User',
        resource: 'users',
        action: 'create',
      });
      mockPermissionRepository.save.mockResolvedValue(savedPermission);

      const result = await service.create(command);

      expect(result).toEqual(savedPermission);
      expect(mockPermissionRepository.save).toHaveBeenCalled();
      const savedEntity = mockPermissionRepository.save.mock.calls[0][0];
      expect(savedEntity.name).toBe('Create User');
      expect(savedEntity.resource).toBe('users');
      expect(savedEntity.action).toBe('create');
    });
  });

  describe('delete', () => {
    it('should delete a permission', async () => {
      mockPermissionRepository.delete.mockResolvedValue(true);

      await service.delete('perm-1');

      expect(mockPermissionRepository.delete).toHaveBeenCalledWith('perm-1');
    });

    it('should throw NotFoundException if permission not found on delete', async () => {
      mockPermissionRepository.delete.mockResolvedValue(false);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
