import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeeService } from './employee.service';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port';
import { DEPARTMENT_REPOSITORY } from '../../domain/repositories/department-repository.port';
import { POSITION_REPOSITORY } from '../../domain/repositories/position-repository.port';
import { USER_SERVICE } from '../../../user/application/ports/user-service.port';
import { CreateEmployeeCommand } from '../commands/create-employee.command';
import { UpdateEmployeeCommand } from '../commands/update-employee.command';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeRepo: any;
  let departmentRepo: any;
  let positionRepo: any;
  let userService: any;
  let dataSource: any;

  beforeEach(async () => {
    employeeRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findActiveEmployees: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getLastEmployeeNumber: jest.fn(),
      createDocument: jest.fn(),
      getDocuments: jest.fn(),
      createHistoryEvent: jest.fn(),
      getHistory: jest.fn(),
    };
    departmentRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    positionRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByNameAndDepartment: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    userService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      changePassword: jest.fn(),
      delete: jest.fn(),
      deactivate: jest.fn(),
      logAuditAction: jest.fn(),
    };
    dataSource = {
      query: jest.fn(),
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: EMPLOYEE_REPOSITORY, useValue: employeeRepo },
        { provide: DEPARTMENT_REPOSITORY, useValue: departmentRepo },
        { provide: POSITION_REPOSITORY, useValue: positionRepo },
        { provide: USER_SERVICE, useValue: userService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  describe('findAll', () => {
    it('should return paginated employees', async () => {
      const expected = { data: [{ id: '1', fullName: 'John Doe' }], total: 1 };
      employeeRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll({
        search: 'John',
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(employeeRepo.findAll).toHaveBeenCalledWith({
        search: 'John',
        page: 1,
        limit: 10,
      });
    });

    it('should work without filters', async () => {
      const expected = { data: [], total: 0 };
      employeeRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
      expect(employeeRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findById', () => {
    it('should return employee with documents and history', async () => {
      const employee = { id: '1', fullName: 'John Doe' };
      const documents = [{ id: 'd1', type: 'KTP' }];
      const history = [{ id: 'h1', eventType: 'hire' }];

      employeeRepo.findById.mockResolvedValue(employee);
      employeeRepo.getDocuments.mockResolvedValue(documents);
      employeeRepo.getHistory.mockResolvedValue(history);

      const result = await service.findById('1');

      expect(result).toEqual({ employee, documents, history });
      expect(employeeRepo.findById).toHaveBeenCalledWith('1');
      expect(employeeRepo.getDocuments).toHaveBeenCalledWith('1');
      expect(employeeRepo.getHistory).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create employee with auto-generated number', async () => {
      const command = new CreateEmployeeCommand(
        'John',
        'Doe',
        'john@test.com',
        '08123',
        'fulltime',
        'dept-1',
        'pos-1',
        5000000,
        '2024-01-15',
      );
      const createdEmployee = {
        id: 'emp-1',
        employeeNumber: 'EMP-2026-0001',
        fullName: 'John Doe',
      };
      const createdUser = { id: 'user-1' };

      employeeRepo.getLastEmployeeNumber.mockResolvedValue(null);
      departmentRepo.findById.mockResolvedValue({ id: 'dept-1' });
      positionRepo.findById.mockResolvedValue({ id: 'pos-1' });
      employeeRepo.create.mockResolvedValue(createdEmployee);
      userService.create.mockResolvedValue(createdUser);
      dataSource.query.mockResolvedValue(undefined);

      const result = await service.create(command);

      expect(result).toEqual(createdEmployee);
      expect(employeeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeNumber: 'EMP-2026-0001',
          fullName: 'John Doe',
          email: 'john@test.com',
          phone: '08123',
          employmentType: 'fulltime',
          departmentId: 'dept-1',
          positionId: 'pos-1',
          basicSalary: 5000000,
          status: 'active',
        }),
      );
    });

    it('should increment employee number from last number', async () => {
      const command = new CreateEmployeeCommand('Jane', 'Smith');
      const createdEmployee = { id: 'emp-2' };

      employeeRepo.getLastEmployeeNumber.mockResolvedValue('EMP-2026-0005');
      employeeRepo.create.mockResolvedValue(createdEmployee);

      const result = await service.create(command);

      expect(employeeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeNumber: 'EMP-2026-0006',
          fullName: 'Jane Smith',
        }),
      );
    });

    it('should throw NotFoundException when department not found', async () => {
      const command = new CreateEmployeeCommand(
        'John',
        'Doe',
        undefined,
        undefined,
        undefined,
        'invalid-dept',
      );

      employeeRepo.getLastEmployeeNumber.mockResolvedValue(null);
      departmentRepo.findById.mockResolvedValue(null);

      await expect(service.create(command)).rejects.toThrow(NotFoundException);
      expect(departmentRepo.findById).toHaveBeenCalledWith('invalid-dept');
    });

    it('should throw NotFoundException when position not found', async () => {
      const command = new CreateEmployeeCommand(
        'John',
        'Doe',
        undefined,
        undefined,
        undefined,
        'dept-1',
        'invalid-pos',
      );

      employeeRepo.getLastEmployeeNumber.mockResolvedValue(null);
      departmentRepo.findById.mockResolvedValue({ id: 'dept-1' });
      positionRepo.findById.mockResolvedValue(null);

      await expect(service.create(command)).rejects.toThrow(NotFoundException);
      expect(positionRepo.findById).toHaveBeenCalledWith('invalid-pos');
    });

    it('should auto-create user account when email is provided', async () => {
      const command = new CreateEmployeeCommand('John', 'Doe', 'john@test.com');
      const createdEmployee = { id: 'emp-1' };
      const createdUser = { id: 'user-1' };

      employeeRepo.getLastEmployeeNumber.mockResolvedValue(null);
      employeeRepo.create.mockResolvedValue(createdEmployee);
      userService.create.mockResolvedValue(createdUser);
      dataSource.query.mockResolvedValue(undefined);

      await service.create(command);

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@test.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'active',
        }),
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        'UPDATE users SET employee_id = $1 WHERE id = $2',
        ['emp-1', 'user-1'],
      );
    });

    it('should link existing user if user creation fails', async () => {
      const command = new CreateEmployeeCommand('John', 'Doe', 'john@test.com');
      const createdEmployee = { id: 'emp-1' };

      employeeRepo.getLastEmployeeNumber.mockResolvedValue(null);
      employeeRepo.create.mockResolvedValue(createdEmployee);
      userService.create.mockRejectedValue(new Error('User already exists'));
      dataSource.query.mockResolvedValue(undefined);

      await service.create(command);

      expect(dataSource.query).toHaveBeenCalledWith(
        'UPDATE users SET employee_id = $1 WHERE email = $2 AND employee_id IS NULL',
        ['emp-1', 'john@test.com'],
      );
    });

    it('should skip user creation when email is not provided', async () => {
      const command = new CreateEmployeeCommand('John', 'Doe');
      const createdEmployee = { id: 'emp-1' };

      employeeRepo.getLastEmployeeNumber.mockResolvedValue(null);
      employeeRepo.create.mockResolvedValue(createdEmployee);

      await service.create(command);

      expect(userService.create).not.toHaveBeenCalled();
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      const command = new CreateEmployeeCommand('John', 'Doe');
      const createdEmployee = { id: 'emp-1' };

      employeeRepo.getLastEmployeeNumber.mockResolvedValue(null);
      employeeRepo.create.mockResolvedValue(createdEmployee);

      await service.create(command);

      expect(employeeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          basicSalary: 0,
          workStartTime: '08:00',
          workEndTime: '17:00',
          breakDurationMinutes: 60,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update employee fields', async () => {
      const existing = { id: '1', fullName: 'John Doe', email: 'old@test.com' };
      const command = new UpdateEmployeeCommand(
        'Jane',
        'Doe',
        'jane@test.com',
        '08999',
      );
      const updated = { id: '1', fullName: 'Jane Doe', email: 'jane@test.com' };

      employeeRepo.findById.mockResolvedValue(existing);
      employeeRepo.update.mockResolvedValue(updated);

      const result = await service.update('1', command);

      expect(result).toEqual(updated);
      expect(employeeRepo.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          fullName: 'Jane Doe',
          email: 'jane@test.com',
          phone: '08999',
        }),
      );
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', new UpdateEmployeeCommand()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate department when updating departmentId', async () => {
      const existing = { id: '1', fullName: 'John Doe' };
      const command = new UpdateEmployeeCommand(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'invalid-dept',
      );

      employeeRepo.findById.mockResolvedValue(existing);
      departmentRepo.findById.mockResolvedValue(null);

      await expect(service.update('1', command)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate position when updating positionId', async () => {
      const existing = { id: '1', fullName: 'John Doe' };
      const command = new UpdateEmployeeCommand(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'invalid-pos',
      );

      employeeRepo.findById.mockResolvedValue(existing);
      positionRepo.findById.mockResolvedValue(null);

      await expect(service.update('1', command)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should auto-create user account when email is changed', async () => {
      const existing = { id: '1', fullName: 'John Doe', email: 'old@test.com' };
      const command = new UpdateEmployeeCommand(
        undefined,
        undefined,
        'new@test.com',
      );
      const updated = { id: '1', email: 'new@test.com' };
      const createdUser = { id: 'user-2' };

      employeeRepo.findById.mockResolvedValue(existing);
      employeeRepo.update.mockResolvedValue(updated);
      userService.create.mockResolvedValue(createdUser);
      dataSource.query.mockResolvedValue(undefined);

      await service.update('1', command);

      expect(userService.create).toHaveBeenCalled();
      expect(dataSource.query).toHaveBeenCalledWith(
        'UPDATE users SET employee_id = $1 WHERE id = $2',
        ['1', 'user-2'],
      );
    });

    it('should not create user when email is unchanged', async () => {
      const existing = {
        id: '1',
        fullName: 'John Doe',
        email: 'same@test.com',
      };
      const command = new UpdateEmployeeCommand(
        undefined,
        undefined,
        'same@test.com',
      );

      employeeRepo.findById.mockResolvedValue(existing);
      employeeRepo.update.mockResolvedValue(existing);

      await service.update('1', command);

      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should map baseSalary to basicSalary and hireDate to joinDate', async () => {
      const existing = { id: '1', fullName: 'John Doe' };
      const command = new UpdateEmployeeCommand(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        8000000,
        '2024-06-01',
      );

      employeeRepo.findById.mockResolvedValue(existing);
      employeeRepo.update.mockResolvedValue({});

      await service.update('1', command);

      expect(employeeRepo.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          basicSalary: 8000000,
          joinDate: new Date('2024-06-01'),
        }),
      );
    });
  });

  describe('uploadDocument', () => {
    it('should create document for existing employee', async () => {
      const employee = { id: '1' };
      const doc = { id: 'd1', type: 'KTP' };

      employeeRepo.findById.mockResolvedValue(employee);
      employeeRepo.createDocument.mockResolvedValue(doc);

      const result = await service.uploadDocument('1', {
        type: 'KTP',
        fileName: 'ktp.jpg',
        filePath: '/docs/ktp.jpg',
        expiryDate: '2025-12-31',
      });

      expect(result).toEqual(doc);
      expect(employeeRepo.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: '1',
          type: 'KTP',
          fileName: 'ktp.jpg',
          filePath: '/docs/ktp.jpg',
        }),
      );
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(
        service.uploadDocument('nonexistent', {
          type: 'KTP',
          fileName: 'x',
          filePath: 'y',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addHistoryEvent', () => {
    it('should create history event for existing employee', async () => {
      const employee = { id: '1' };
      const event = { id: 'h1', eventType: 'promotion' };

      employeeRepo.findById.mockResolvedValue(employee);
      employeeRepo.createHistoryEvent.mockResolvedValue(event);

      const result = await service.addHistoryEvent('1', {
        eventType: 'promotion',
        description: 'Promoted to senior',
        effectiveDate: '2024-01-01',
      });

      expect(result).toEqual(event);
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(
        service.addHistoryEvent('nonexistent', {
          eventType: 'test',
          description: 'test',
          effectiveDate: '2024-01-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
