import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CUSTOMER_REPOSITORY } from '../../domain/repositories/customer-repository.port';
import { CreateCustomerCommand } from '../commands/create-customer.command';
import { UpdateCustomerCommand } from '../commands/update-customer.command';

describe('CustomerService', () => {
  let service: CustomerService;

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
        CustomerService,
        { provide: CUSTOMER_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(CustomerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all customers with filters', async () => {
      const expected = { data: [{ id: '1', name: 'Test' }], total: 1 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll({ search: 'Test', page: 1, limit: 10 });

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith({ search: 'Test', page: 1, limit: 10 });
    });

    it('should return all customers without filters', async () => {
      const expected = { data: [], total: 0 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findById', () => {
    it('should return a customer by id', async () => {
      const customer = { id: '1', name: 'Test' };
      mockRepo.findById.mockResolvedValue(customer);

      const result = await service.findById('1');

      expect(result).toEqual(customer);
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
    });

    it('should return null if customer not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a customer', async () => {
      const command = new CreateCustomerCommand('Acme Corp', 'acme@test.com', '123', 'Addr', 'City', 'John', 'TAX1', 'notes');
      const created = { id: '1', ...command, status: 'active' };
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(command);

      expect(result).toEqual(created);
      expect(mockRepo.findByName).toHaveBeenCalledWith('Acme Corp');
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Acme Corp',
        email: 'acme@test.com',
        phone: '123',
        address: 'Addr',
        city: 'City',
        contactPerson: 'John',
        taxId: 'TAX1',
        notes: 'notes',
        status: 'active',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
    });

    it('should throw ConflictException if customer name already exists', async () => {
      const command = new CreateCustomerCommand('Existing Corp');
      mockRepo.findByName.mockResolvedValue({ id: '1', name: 'Existing Corp' });

      await expect(service.create(command)).rejects.toThrow(ConflictException);
      await expect(service.create(command)).rejects.toThrow('Customer with this name already exists');
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const entity = { id: '1', name: 'Old Name', email: 'old@test.com', status: 'active' };
      const command = new UpdateCustomerCommand('New Name', 'new@test.com');
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.save.mockResolvedValue({ ...entity, name: 'New Name', email: 'new@test.com' });

      const result = await service.update('1', command);

      expect(result.name).toBe('New Name');
      expect(result.email).toBe('new@test.com');
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const entity = { id: '1', name: 'Old Name', email: 'old@test.com', phone: '123', status: 'active' };
      const command = new UpdateCustomerCommand(undefined, 'new@test.com');
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.save.mockImplementation(async (e) => e);

      const result = await service.update('1', command);

      expect(result.name).toBe('Old Name');
      expect(result.email).toBe('new@test.com');
      expect(result.phone).toBe('123');
    });

    it('should update status when provided', async () => {
      const entity = { id: '1', name: 'Test', status: 'active' };
      const command = new UpdateCustomerCommand(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'inactive');
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.save.mockImplementation(async (e) => e);

      const result = await service.update('1', command);

      expect(result.status).toBe('inactive');
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.update('999', new UpdateCustomerCommand('Test'))).rejects.toThrow(NotFoundException);
      await expect(service.update('999', new UpdateCustomerCommand('Test'))).rejects.toThrow('Customer not found');
    });
  });

  describe('delete', () => {
    it('should delete a customer', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'Test' });
      mockRepo.delete.mockResolvedValue(undefined);

      await service.delete('1');

      expect(mockRepo.findById).toHaveBeenCalledWith('1');
      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.delete('999')).rejects.toThrow(NotFoundException);
      await expect(service.delete('999')).rejects.toThrow('Customer not found');
    });
  });
});
