import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SUPPLIER_REPOSITORY } from '../../domain/repositories/supplier-repository.port';
import { CreateSupplierCommand } from '../commands/create-supplier.command';
import { UpdateSupplierCommand } from '../commands/update-supplier.command';

describe('SupplierService', () => {
  let service: SupplierService;

  const mockRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: SUPPLIER_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(SupplierService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all suppliers with filters', async () => {
      const expected = { data: [{ id: '1', name: 'Test Supplier' }], total: 1 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll({ search: 'Test', status: 'active', page: 1, limit: 10 });

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith({ search: 'Test', status: 'active', page: 1, limit: 10 });
    });

    it('should return all suppliers without filters', async () => {
      const expected = { data: [], total: 0 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findById', () => {
    it('should return a supplier by id', async () => {
      const supplier = { id: '1', name: 'Test Supplier' };
      mockRepo.findById.mockResolvedValue(supplier);

      const result = await service.findById('1');

      expect(result).toEqual(supplier);
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
    });

    it('should return null if supplier not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a supplier', async () => {
      const command = new CreateSupplierCommand('Parts Co', 'parts@test.com', '123', 'Addr', 'City', 'John', 'TAX1', 'ACC1', 'Bank1', 'notes');
      const created = { id: '1', ...command, status: 'active' };
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(command);

      expect(result).toEqual(created);
      expect(mockRepo.findByName).toHaveBeenCalledWith('Parts Co');
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Parts Co',
        email: 'parts@test.com',
        phone: '123',
        address: 'Addr',
        city: 'City',
        contactPerson: 'John',
        taxId: 'TAX1',
        bankAccount: 'ACC1',
        bankName: 'Bank1',
        notes: 'notes',
        status: 'active',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
    });

    it('should throw ConflictException if supplier name already exists', async () => {
      const command = new CreateSupplierCommand('Existing Supplier');
      mockRepo.findByName.mockResolvedValue({ id: '1', name: 'Existing Supplier' });

      await expect(service.create(command)).rejects.toThrow(ConflictException);
      await expect(service.create(command)).rejects.toThrow('Supplier with this name already exists');
    });
  });

  describe('update', () => {
    it('should update a supplier', async () => {
      const entity = { id: '1', name: 'Old Name', email: 'old@test.com', status: 'active' };
      const command = new UpdateSupplierCommand('New Name', 'new@test.com');
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.save.mockResolvedValue({ ...entity, name: 'New Name', email: 'new@test.com' });

      const result = await service.update('1', command);

      expect(result.name).toBe('New Name');
      expect(result.email).toBe('new@test.com');
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const entity = { id: '1', name: 'Old Name', email: 'old@test.com', phone: '123', bankAccount: 'ACC1', bankName: 'Bank1', status: 'active' };
      const command = new UpdateSupplierCommand(undefined, 'new@test.com');
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.save.mockImplementation(async (e) => e);

      const result = await service.update('1', command);

      expect(result.name).toBe('Old Name');
      expect(result.email).toBe('new@test.com');
      expect(result.bankAccount).toBe('ACC1');
    });

    it('should update bank details when provided', async () => {
      const entity = { id: '1', name: 'Test', bankAccount: 'OLD_ACC', bankName: 'Old Bank', status: 'active' };
      const command = new UpdateSupplierCommand(undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'NEW_ACC', 'New Bank');
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.save.mockImplementation(async (e) => e);

      const result = await service.update('1', command);

      expect(result.bankAccount).toBe('NEW_ACC');
      expect(result.bankName).toBe('New Bank');
    });

    it('should throw NotFoundException if supplier not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.update('999', new UpdateSupplierCommand('Test'))).rejects.toThrow(NotFoundException);
      await expect(service.update('999', new UpdateSupplierCommand('Test'))).rejects.toThrow('Supplier not found');
    });
  });

  describe('delete', () => {
    it('should delete a supplier', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'Test' });
      mockRepo.delete.mockResolvedValue(undefined);

      await service.delete('1');

      expect(mockRepo.findById).toHaveBeenCalledWith('1');
      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if supplier not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.delete('999')).rejects.toThrow(NotFoundException);
      await expect(service.delete('999')).rejects.toThrow('Supplier not found');
    });
  });
});
