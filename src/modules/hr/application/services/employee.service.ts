import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port';
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port';
import { DEPARTMENT_REPOSITORY } from '../../domain/repositories/department-repository.port';
import type { DepartmentRepositoryPort } from '../../domain/repositories/department-repository.port';
import { POSITION_REPOSITORY } from '../../domain/repositories/position-repository.port';
import type { PositionRepositoryPort } from '../../domain/repositories/position-repository.port';
import { USER_PROVISIONING_PORT } from '../../../../shared/kernel/domain/ports/user-provisioning.port';
import type { UserProvisioningPort } from '../../../../shared/kernel/domain/ports/user-provisioning.port';
import type { EmployeeServicePort } from '../ports/employee-service.port';
import { CreateEmployeeCommand } from '../commands/create-employee.command';
import { UpdateEmployeeCommand } from '../commands/update-employee.command';

export interface UploadDocumentDto {
  type: string;
  fileName: string;
  filePath: string;
  expiryDate?: string;
}

export interface AddHistoryEventDto {
  eventType: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  effectiveDate: string;
}

@Injectable()
export class EmployeeService implements EmployeeServicePort {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly employeeRepo: EmployeeRepositoryPort,
    @Inject(DEPARTMENT_REPOSITORY)
    private readonly departmentRepo: DepartmentRepositoryPort,
    @Inject(POSITION_REPOSITORY)
    private readonly positionRepo: PositionRepositoryPort,
    @Inject(USER_PROVISIONING_PORT)
    private readonly userProvisioning: UserProvisioningPort,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: {
    search?: string;
    employmentType?: string;
    departmentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    return this.employeeRepo.findAll(filters);
  }

  async findById(id: string): Promise<{
    employee: any;
    documents: any[];
    history: any[];
  }> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');

    // Fetch linked user's username
    const userRow = await this.dataSource.query(
      `SELECT username FROM users WHERE employee_id = $1 LIMIT 1`,
      [id],
    );
    if (userRow?.[0]?.username) {
      (employee as any).username = userRow[0].username;
    } else {
      (employee as any).username = null;
    }

    const documents = await this.employeeRepo.getDocuments(id);
    const history = await this.employeeRepo.getHistory(id);

    return { employee, documents, history };
  }

  async create(command: CreateEmployeeCommand): Promise<any> {
    const employeeNumber = await this.generateEmployeeNumber();
    const fullName = `${command.firstName} ${command.lastName}`.trim();

    // Validate department exists
    if (command.departmentId) {
      const department = await this.departmentRepo.findById(
        command.departmentId,
      );
      if (!department) throw new NotFoundException('Department not found');
    }

    // Validate position exists
    if (command.positionId) {
      const position = await this.positionRepo.findById(command.positionId);
      if (!position) throw new NotFoundException('Position not found');
    }

    const employee = await this.employeeRepo.create({
      employeeNumber,
      fullName,
      email: command.email,
      phone: command.phone,
      employmentType: command.employmentType,
      departmentId: command.departmentId,
      positionId: command.positionId,
      joinDate: command.hireDate ? new Date(command.hireDate) : new Date(),
      basicSalary: command.baseSalary ?? 0,
      status: 'active',
      workStartTime: command.workStartTime ?? '08:00',
      workEndTime: command.workEndTime ?? '17:00',
      breakDurationMinutes: command.breakDurationMinutes ?? 60,
    });

    // Auto-create user account for the employee and link it
    if (command.email) {
      try {
        const user = await this.userProvisioning.createUser({
          email: command.email,
          firstName: command.firstName,
          lastName: command.lastName,
          roles: [],
          status: 'active',
          ...(command.username ? { username: command.username } : {}),
        });
        // Link user to employee
        await this.userProvisioning.linkUserToEmployee(user.id, employee.id);
      } catch {
        // silently skip if linking fails
      }
    }

    return employee;
  }

  async update(id: string, command: UpdateEmployeeCommand): Promise<any> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');

    const updateData: any = {};

    if (command.firstName !== undefined || command.lastName !== undefined) {
      const firstName =
        command.firstName ?? employee.fullName?.split(' ')[0] ?? '';
      const lastName =
        command.lastName ??
        employee.fullName?.split(' ').slice(1).join(' ') ??
        '';
      updateData.fullName = `${firstName} ${lastName}`.trim();
    }
    if (command.email !== undefined) updateData.email = command.email;
    if (command.phone !== undefined) updateData.phone = command.phone;
    if (command.employmentType !== undefined)
      updateData.employmentType = command.employmentType;

    if (command.departmentId !== undefined) {
      if (command.departmentId) {
        const department = await this.departmentRepo.findById(
          command.departmentId,
        );
        if (!department) throw new NotFoundException('Department not found');
      }
      updateData.departmentId = command.departmentId || null;
    }

    if (command.positionId !== undefined) {
      if (command.positionId) {
        const position = await this.positionRepo.findById(command.positionId);
        if (!position) throw new NotFoundException('Position not found');
      }
      updateData.positionId = command.positionId || null;
    }

    if (command.baseSalary !== undefined)
      updateData.basicSalary = command.baseSalary;
    if (command.hireDate !== undefined)
      updateData.joinDate = new Date(command.hireDate);
    if (command.status !== undefined) updateData.status = command.status;
    if (command.workStartTime !== undefined)
      updateData.workStartTime = command.workStartTime;
    if (command.workEndTime !== undefined)
      updateData.workEndTime = command.workEndTime;
    if (command.breakDurationMinutes !== undefined)
      updateData.breakDurationMinutes = command.breakDurationMinutes;

    const updatedEmployee = await this.employeeRepo.update(id, updateData);

    // Update username on the linked user account if provided
    if (command.username !== undefined) {
      try {
        await this.dataSource.query(
          `UPDATE users SET username = $1 WHERE employee_id = $2`,
          [command.username || null, id],
        );
      } catch {
        // silently skip if update fails (e.g. username already taken)
      }
    }

    // Auto-create user account if email is being set and employee doesn't have one yet
    const newEmail = command.email ?? employee.email;
    if (newEmail && command.email && command.email !== employee.email) {
      try {
        const firstName =
          command.firstName ?? employee.fullName?.split(' ')[0] ?? '';
        const lastName =
          command.lastName ??
          employee.fullName?.split(' ').slice(1).join(' ') ??
          '';
        const user = await this.userProvisioning.createUser({
          email: newEmail,
          firstName,
          lastName,
          roles: [],
          status: 'active',
        });
        // Link user to employee
        await this.userProvisioning.linkUserToEmployee(user.id, id);
      } catch {
        // If user already exists, try to link existing user to this employee
        try {
          await this.dataSource.query(
            `UPDATE users SET employee_id = $1 WHERE email = $2 AND employee_id IS NULL`,
            [id, newEmail],
          );
        } catch {
          // silently skip
        }
      }
    }

    return updatedEmployee;
  }

  async uploadDocument(
    employeeId: string,
    dto: UploadDocumentDto,
  ): Promise<any> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeRepo.createDocument({
      employeeId,
      type: dto.type,
      fileName: dto.fileName,
      filePath: dto.filePath,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    });
  }

  async getDocuments(employeeId: string): Promise<any[]> {
    return this.employeeRepo.getDocuments(employeeId);
  }

  async getHistory(employeeId: string): Promise<any[]> {
    return this.employeeRepo.getHistory(employeeId);
  }

  async addHistoryEvent(
    employeeId: string,
    dto: AddHistoryEventDto,
  ): Promise<any> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeRepo.createHistoryEvent({
      employeeId,
      eventType: dto.eventType,
      description: dto.description,
      previousValue: dto.previousValue,
      newValue: dto.newValue,
      effectiveDate: new Date(dto.effectiveDate),
    });
  }

  private async generateEmployeeNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}-`;
    const lastNumber = await this.employeeRepo.getLastEmployeeNumber(prefix);

    if (!lastNumber) return `${prefix}0001`;
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
