import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MyProfileService } from './my-profile.service';
import { PROFILE_CHANGE_REQUEST_REPOSITORY } from '../../domain/repositories/self-service-repository.port';

describe('MyProfileService', () => {
  let service: MyProfileService;

  const mockEmployeeRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDocumentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
    getRepository: jest.fn(),
  };

  const mockProfileChangeRequestRepo = {
    create: jest.fn(),
    findByEmployeeId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findPending: jest.fn(),
  };

  beforeEach(async () => {
    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity.name === 'EmployeeTypeOrmEntity') return mockEmployeeRepo;
      if (entity.name === 'EmployeeDocumentTypeOrmEntity') return mockDocumentRepo;
      return {};
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyProfileService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: PROFILE_CHANGE_REQUEST_REPOSITORY, useValue: mockProfileChangeRequestRepo },
      ],
    }).compile();

    service = module.get(MyProfileService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEmployeeIdFromUserId', () => {
    it('should return employee id for valid user', async () => {
      mockDataSource.query.mockResolvedValue([{ employee_id: 'emp-1' }]);

      const result = await service.getEmployeeIdFromUserId('user-1');

      expect(result).toBe('emp-1');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        `SELECT employee_id FROM users WHERE id = $1`,
        ['user-1'],
      );
    });

    it('should throw NotFoundException if no employee linked', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await expect(service.getEmployeeIdFromUserId('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if employee_id is null', async () => {
      mockDataSource.query.mockResolvedValue([{ employee_id: null }]);

      await expect(service.getEmployeeIdFromUserId('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return employee profile with documents', async () => {
      const employee = { id: 'emp-1', firstName: 'John', lastName: 'Doe' };
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      mockDocumentRepo.find.mockResolvedValue([{ id: 'doc-1', fileName: 'contract.pdf' }]);

      const result = await service.getProfile('emp-1');

      expect(result.id).toBe('emp-1');
      expect(result.documents).toHaveLength(1);
      expect(mockEmployeeRepo.findOne).toHaveBeenCalledWith({ where: { id: 'emp-1' } });
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update whitelisted fields', async () => {
      const employee = { id: 'emp-1', phone: '1234567890', address: 'Old Address' };
      mockEmployeeRepo.findOne.mockResolvedValue(employee);
      mockEmployeeRepo.save.mockResolvedValue({ ...employee, phone: '0987654321', address: 'New Address' });

      const result = await service.updateProfile('emp-1', { phone: '0987654321', address: 'New Address' });

      expect(result.phone).toBe('0987654321');
      expect(result.address).toBe('New Address');
      expect(mockEmployeeRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-whitelisted fields', async () => {
      await expect(
        service.updateProfile('emp-1', { firstName: 'Hacker', salary: 99999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent', { phone: '123' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createChangeRequest', () => {
    it('should create a profile change request', async () => {
      const requestData = {
        fieldName: 'phone',
        oldValue: '1234567890',
        newValue: '0987654321',
        reason: 'Changed number',
      };
      const created = { id: 'req-1', employeeId: 'emp-1', ...requestData, status: 'pending' };
      mockProfileChangeRequestRepo.create.mockResolvedValue(created);

      const result = await service.createChangeRequest('emp-1', requestData);

      expect(result).toEqual(created);
      expect(mockProfileChangeRequestRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        fieldName: 'phone',
        oldValue: '1234567890',
        newValue: '0987654321',
        reason: 'Changed number',
        status: 'pending',
      });
    });
  });

  describe('getDocuments', () => {
    it('should return employee documents sorted by upload date desc', async () => {
      const documents = [
        { id: 'doc-2', fileName: 'recent.pdf', uploadedAt: new Date('2024-06-01') },
        { id: 'doc-1', fileName: 'old.pdf', uploadedAt: new Date('2024-01-01') },
      ];
      mockDocumentRepo.find.mockResolvedValue(documents);

      const result = await service.getDocuments('emp-1');

      expect(result).toEqual(documents);
      expect(mockDocumentRepo.find).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
        order: { uploadedAt: 'DESC' },
      });
    });
  });

  describe('getDocumentDownloadUrl', () => {
    it('should return a download URL with expiry', async () => {
      const doc = { id: 'doc-1', employeeId: 'emp-1', filePath: '/uploads/doc.pdf' };
      mockDocumentRepo.findOne.mockResolvedValue(doc);

      const result = await service.getDocumentDownloadUrl('emp-1', 'doc-1');

      expect(result).toContain('/uploads/doc.pdf?expires=');
    });

    it('should throw NotFoundException if document not found', async () => {
      mockDocumentRepo.findOne.mockResolvedValue(null);

      await expect(service.getDocumentDownloadUrl('emp-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
