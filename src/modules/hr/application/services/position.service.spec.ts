import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PositionService } from './position.service';
import { POSITION_REPOSITORY } from '../../domain/repositories/position-repository.port';
import { DEPARTMENT_REPOSITORY } from '../../domain/repositories/department-repository.port';
import { CreatePositionCommand } from '../commands/create-position.command';
import { UpdatePositionCommand } from '../commands/update-position.command';

describe('PositionService', () => {
  let service: PositionService;

  const mockPositionRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByNameAndDepartment: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockDepartmentRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionService,
        { provide: POSITION_REPOSITORY, useValue: mockPositionRepo },
        { provide: DEPARTMENT_REPOSITORY, useValue: mockDepartmentRepo },
      ],
    }).compile();

    service = module.get(PositionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all positions with filters', async () => {
      const expected = { data: [{ id: '1', name: 'Developer' }], total: 1 };
      mockPositionRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll({
        search: 'Dev',
        departmentId: 'd1',
        isActive: true,
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(mockPositionRepo.findAll).toHaveBeenCalledWith({
        search: 'Dev',
        departmentId: 'd1',
        isActive: true,
        page: 1,
        limit: 10,
      });
    });

    it('should return all positions without filters', async () => {
      const expected = { data: [], total: 0 };
      mockPositionRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
      expect(mockPositionRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findById', () => {
    it('should return a position by id', async () => {
      const position = { id: '1', name: 'Developer', departmentId: 'd1' };
      mockPositionRepo.findById.mockResolvedValue(position);

      const result = await service.findById('1');

      expect(result).toEqual(position);
      expect(mockPositionRepo.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if position not found', async () => {
      mockPositionRepo.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
      await expect(service.findById('999')).rejects.toThrow(
        'Position not found',
      );
    });
  });

  describe('create', () => {
    it('should create a position without department', async () => {
      const command = new CreatePositionCommand('Developer');
      const created = { id: '1', name: 'Developer', isActive: true };
      mockPositionRepo.findByNameAndDepartment.mockResolvedValue(null);
      mockPositionRepo.create.mockResolvedValue(created);

      const result = await service.create(command);

      expect(result).toEqual(created);
      expect(mockDepartmentRepo.findById).not.toHaveBeenCalled();
      expect(mockPositionRepo.findByNameAndDepartment).toHaveBeenCalledWith(
        'Developer',
        undefined,
      );
      expect(mockPositionRepo.create).toHaveBeenCalledWith({
        name: 'Developer',
        departmentId: undefined,
        description: undefined,
        isActive: true,
      });
    });

    it('should create a position with department', async () => {
      const command = new CreatePositionCommand(
        'Frontend Dev',
        'd1',
        'Frontend developer role',
      );
      const department = { id: 'd1', name: 'Engineering' };
      const created = {
        id: '1',
        name: 'Frontend Dev',
        departmentId: 'd1',
        description: 'Frontend developer role',
        isActive: true,
      };
      mockDepartmentRepo.findById.mockResolvedValue(department);
      mockPositionRepo.findByNameAndDepartment.mockResolvedValue(null);
      mockPositionRepo.create.mockResolvedValue(created);

      const result = await service.create(command);

      expect(result).toEqual(created);
      expect(mockDepartmentRepo.findById).toHaveBeenCalledWith('d1');
      expect(mockPositionRepo.findByNameAndDepartment).toHaveBeenCalledWith(
        'Frontend Dev',
        'd1',
      );
    });

    it('should throw NotFoundException if department not found', async () => {
      const command = new CreatePositionCommand(
        'Developer',
        'nonexistent-dept',
      );
      mockDepartmentRepo.findById.mockResolvedValue(null);

      await expect(service.create(command)).rejects.toThrow(NotFoundException);
      await expect(service.create(command)).rejects.toThrow(
        'Department not found',
      );
    });

    it('should throw ConflictException if position already exists in department', async () => {
      const command = new CreatePositionCommand('Developer', 'd1');
      mockDepartmentRepo.findById.mockResolvedValue({
        id: 'd1',
        name: 'Engineering',
      });
      mockPositionRepo.findByNameAndDepartment.mockResolvedValue({
        id: '1',
        name: 'Developer',
        departmentId: 'd1',
      });

      await expect(service.create(command)).rejects.toThrow(ConflictException);
      await expect(service.create(command)).rejects.toThrow(
        'Position already exists in this department',
      );
    });
  });

  describe('update', () => {
    it('should update a position', async () => {
      const position = {
        id: '1',
        name: 'Old Name',
        departmentId: 'd1',
        isActive: true,
      };
      const command = new UpdatePositionCommand(
        'New Name',
        'd2',
        'Updated desc',
        false,
      );
      mockPositionRepo.findById.mockResolvedValue(position);
      mockDepartmentRepo.findById.mockResolvedValue({ id: 'd2' });
      mockPositionRepo.findByNameAndDepartment.mockResolvedValue(null);
      mockPositionRepo.update.mockResolvedValue({
        ...position,
        name: 'New Name',
      });

      const result = await service.update('1', command);

      expect(mockPositionRepo.findById).toHaveBeenCalledWith('1');
      expect(mockDepartmentRepo.findById).toHaveBeenCalledWith('d2');
      expect(mockPositionRepo.findByNameAndDepartment).toHaveBeenCalledWith(
        'New Name',
        'd2',
      );
      expect(mockPositionRepo.update).toHaveBeenCalledWith('1', {
        name: 'New Name',
        departmentId: 'd2',
        description: 'Updated desc',
        isActive: false,
      });
    });

    it('should update only provided fields', async () => {
      const position = {
        id: '1',
        name: 'Developer',
        departmentId: 'd1',
        isActive: true,
      };
      const command = new UpdatePositionCommand(
        undefined,
        undefined,
        'Updated desc',
      );
      mockPositionRepo.findById.mockResolvedValue(position);
      mockPositionRepo.update.mockImplementation(async (id, data) => ({
        ...position,
        ...data,
      }));

      const result = await service.update('1', command);

      expect(result.description).toBe('Updated desc');
      expect(result.name).toBe('Developer');
      expect(mockDepartmentRepo.findById).not.toHaveBeenCalled();
      expect(mockPositionRepo.update).toHaveBeenCalledWith('1', {
        description: 'Updated desc',
      });
    });

    it('should throw NotFoundException if position not found', async () => {
      mockPositionRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('999', new UpdatePositionCommand('Test')),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('999', new UpdatePositionCommand('Test')),
      ).rejects.toThrow('Position not found');
    });

    it('should throw NotFoundException if new department not found', async () => {
      const position = { id: '1', name: 'Developer', departmentId: 'd1' };
      mockPositionRepo.findById.mockResolvedValue(position);
      mockDepartmentRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(
          '1',
          new UpdatePositionCommand(undefined, 'nonexistent'),
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(
          '1',
          new UpdatePositionCommand(undefined, 'nonexistent'),
        ),
      ).rejects.toThrow('Department not found');
    });

    it('should throw ConflictException if updated name conflicts in same department', async () => {
      const position = { id: '1', name: 'Developer', departmentId: 'd1' };
      const command = new UpdatePositionCommand('Manager');
      mockPositionRepo.findById.mockResolvedValue(position);
      mockPositionRepo.findByNameAndDepartment.mockResolvedValue({
        id: '2',
        name: 'Manager',
        departmentId: 'd1',
      });

      await expect(service.update('1', command)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update('1', command)).rejects.toThrow(
        'Position already exists in this department',
      );
    });

    it('should not throw conflict if found position is the same being updated', async () => {
      const position = { id: '1', name: 'Developer', departmentId: 'd1' };
      const command = new UpdatePositionCommand('Senior Developer');
      mockPositionRepo.findById.mockResolvedValue(position);
      mockPositionRepo.findByNameAndDepartment.mockResolvedValue({
        id: '1',
        name: 'Senior Developer',
        departmentId: 'd1',
      });
      mockPositionRepo.update.mockResolvedValue({
        ...position,
        name: 'Senior Developer',
      });

      const result = await service.update('1', command);

      expect(result.name).toBe('Senior Developer');
    });

    it('should check conflict when only departmentId changes', async () => {
      const position = { id: '1', name: 'Developer', departmentId: 'd1' };
      const command = new UpdatePositionCommand(undefined, 'd2');
      mockPositionRepo.findById.mockResolvedValue(position);
      mockDepartmentRepo.findById.mockResolvedValue({ id: 'd2' });
      mockPositionRepo.findByNameAndDepartment.mockResolvedValue({
        id: '2',
        name: 'Developer',
        departmentId: 'd2',
      });

      await expect(service.update('1', command)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a position', async () => {
      mockPositionRepo.findById.mockResolvedValue({
        id: '1',
        name: 'Developer',
      });
      mockPositionRepo.delete.mockResolvedValue(undefined);

      await service.delete('1');

      expect(mockPositionRepo.findById).toHaveBeenCalledWith('1');
      expect(mockPositionRepo.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if position not found', async () => {
      mockPositionRepo.findById.mockResolvedValue(null);

      await expect(service.delete('999')).rejects.toThrow(NotFoundException);
      await expect(service.delete('999')).rejects.toThrow('Position not found');
    });
  });
});
