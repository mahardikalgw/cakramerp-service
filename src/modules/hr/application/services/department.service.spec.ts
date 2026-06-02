import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DEPARTMENT_REPOSITORY } from '../../domain/repositories/department-repository.port';
import { CreateDepartmentCommand } from '../commands/create-department.command';
import { UpdateDepartmentCommand } from '../commands/update-department.command';

describe('DepartmentService', () => {
  let service: DepartmentService;

  const mockRepo = {
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
        DepartmentService,
        { provide: DEPARTMENT_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(DepartmentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all departments with filters', async () => {
      const expected = { data: [{ id: '1', name: 'Engineering' }], total: 1 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll({
        search: 'Eng',
        isActive: true,
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith({
        search: 'Eng',
        isActive: true,
        page: 1,
        limit: 10,
      });
    });

    it('should return all departments without filters', async () => {
      const expected = { data: [], total: 0 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findById', () => {
    it('should return a department by id', async () => {
      const department = { id: '1', name: 'Engineering' };
      mockRepo.findById.mockResolvedValue(department);

      const result = await service.findById('1');

      expect(result).toEqual(department);
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if department not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
      await expect(service.findById('999')).rejects.toThrow(
        'Department not found',
      );
    });
  });

  describe('create', () => {
    it('should create a department', async () => {
      const command = new CreateDepartmentCommand(
        'Engineering',
        'Software engineering team',
      );
      const created = {
        id: '1',
        name: 'Engineering',
        description: 'Software engineering team',
        isActive: true,
      };
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(created);

      const result = await service.create(command);

      expect(result).toEqual(created);
      expect(mockRepo.findByName).toHaveBeenCalledWith('Engineering');
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Engineering',
        description: 'Software engineering team',
        isActive: true,
      });
    });

    it('should create a department without description', async () => {
      const command = new CreateDepartmentCommand('HR');
      const created = { id: '1', name: 'HR', isActive: true };
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(created);

      const result = await service.create(command);

      expect(result).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'HR',
        description: undefined,
        isActive: true,
      });
    });

    it('should throw ConflictException if department name already exists', async () => {
      const command = new CreateDepartmentCommand('Engineering');
      mockRepo.findByName.mockResolvedValue({ id: '1', name: 'Engineering' });

      await expect(service.create(command)).rejects.toThrow(ConflictException);
      await expect(service.create(command)).rejects.toThrow(
        'Department name already exists',
      );
    });
  });

  describe('update', () => {
    it('should update a department', async () => {
      const department = {
        id: '1',
        name: 'Old Name',
        description: 'Old desc',
        isActive: true,
      };
      const command = new UpdateDepartmentCommand(
        'New Name',
        'New desc',
        false,
      );
      mockRepo.findById.mockResolvedValue(department);
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue({
        ...department,
        name: 'New Name',
        description: 'New desc',
        isActive: false,
      });

      const result = await service.update('1', command);

      expect(mockRepo.findById).toHaveBeenCalledWith('1');
      expect(mockRepo.update).toHaveBeenCalledWith('1', {
        name: 'New Name',
        description: 'New desc',
        isActive: false,
      });
    });

    it('should update only provided fields', async () => {
      const department = {
        id: '1',
        name: 'Engineering',
        description: 'Old desc',
        isActive: true,
      };
      const command = new UpdateDepartmentCommand(undefined, 'New desc');
      mockRepo.findById.mockResolvedValue(department);
      mockRepo.update.mockImplementation(async (id, data) => ({
        ...department,
        ...data,
      }));

      const result = await service.update('1', command);

      expect(result.description).toBe('New desc');
      expect(result.name).toBe('Engineering');
      expect(mockRepo.update).toHaveBeenCalledWith('1', {
        description: 'New desc',
      });
    });

    it('should check for name conflict when name changes', async () => {
      const department = { id: '1', name: 'Engineering', isActive: true };
      const command = new UpdateDepartmentCommand('HR');
      mockRepo.findById.mockResolvedValue(department);
      mockRepo.findByName.mockResolvedValue({ id: '2', name: 'HR' });

      await expect(service.update('1', command)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update('1', command)).rejects.toThrow(
        'Department name already exists',
      );
    });

    it('should not check for name conflict when name is the same', async () => {
      const department = { id: '1', name: 'Engineering', isActive: true };
      const command = new UpdateDepartmentCommand(
        'Engineering',
        'Updated desc',
      );
      mockRepo.findById.mockResolvedValue(department);
      mockRepo.update.mockResolvedValue({
        ...department,
        description: 'Updated desc',
      });

      await service.update('1', command);

      expect(mockRepo.findByName).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if department not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('999', new UpdateDepartmentCommand('Test')),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('999', new UpdateDepartmentCommand('Test')),
      ).rejects.toThrow('Department not found');
    });
  });

  describe('delete', () => {
    it('should delete a department', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'Engineering' });
      mockRepo.delete.mockResolvedValue(undefined);

      await service.delete('1');

      expect(mockRepo.findById).toHaveBeenCalledWith('1');
      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if department not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.delete('999')).rejects.toThrow(NotFoundException);
      await expect(service.delete('999')).rejects.toThrow(
        'Department not found',
      );
    });
  });
});
