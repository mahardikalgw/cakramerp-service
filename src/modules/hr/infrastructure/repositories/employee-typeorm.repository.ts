import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port';
import { EmployeeTypeOrmEntity } from '../entities/employee-typeorm.entity';
import { EmployeeDocumentTypeOrmEntity } from '../entities/employee-document-typeorm.entity';
import { EmployeeHistoryTypeOrmEntity } from '../entities/employee-history-typeorm.entity';
import { DepartmentTypeOrmEntity } from '../entities/department-typeorm.entity';
import { PositionTypeOrmEntity } from '../entities/position-typeorm.entity';

@Injectable()
export class EmployeeTypeOrmRepository implements EmployeeRepositoryPort {
  private readonly employeeRepo: Repository<EmployeeTypeOrmEntity>;
  private readonly documentRepo: Repository<EmployeeDocumentTypeOrmEntity>;
  private readonly historyRepo: Repository<EmployeeHistoryTypeOrmEntity>;
  private readonly departmentRepo: Repository<DepartmentTypeOrmEntity>;
  private readonly positionRepo: Repository<PositionTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.employeeRepo = dataSource.getRepository(EmployeeTypeOrmEntity);
    this.documentRepo = dataSource.getRepository(EmployeeDocumentTypeOrmEntity);
    this.historyRepo = dataSource.getRepository(EmployeeHistoryTypeOrmEntity);
    this.departmentRepo = dataSource.getRepository(DepartmentTypeOrmEntity);
    this.positionRepo = dataSource.getRepository(PositionTypeOrmEntity);
  }

  async findAll(filters?: {
    search?: string;
    employmentType?: string;
    siteId?: string;
    departmentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.employeeRepo
      .createQueryBuilder('emp')
      .leftJoin(DepartmentTypeOrmEntity, 'dept', 'dept.id = emp.departmentId')
      .leftJoin(PositionTypeOrmEntity, 'pos', 'pos.id = emp.positionId')
      .addSelect('dept.name', 'departmentName')
      .addSelect('pos.name', 'positionName')
      .where('emp.deleted_at IS NULL');

    if (filters?.search) {
      qb.andWhere(
        '(emp.fullName ILIKE :search OR emp.employeeNumber ILIKE :search OR emp.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters?.employmentType) {
      qb.andWhere('emp.employmentType = :employmentType', {
        employmentType: filters.employmentType,
      });
    }
    if (filters?.departmentId) {
      qb.andWhere('emp.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }
    if (filters?.status) {
      qb.andWhere('emp.status = :status', { status: filters.status });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('emp.fullName', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [rawData, total] = await qb.getManyAndCount();

    // Fetch department and position names for the results
    const data = await Promise.all(
      rawData.map(async (emp) => {
        const department = emp.departmentId
          ? await this.departmentRepo.findOne({
              where: { id: emp.departmentId },
            })
          : null;
        const position = emp.positionId
          ? await this.positionRepo.findOne({ where: { id: emp.positionId } })
          : null;
        return {
          ...emp,
          departmentName: department?.name ?? null,
          positionName: position?.name ?? null,
        };
      }),
    );

    return { data, total };
  }

  async findById(id: string): Promise<any | null> {
    const emp = await this.employeeRepo.findOne({ where: { id } });
    if (!emp) return null;

    const department = emp.departmentId
      ? await this.departmentRepo.findOne({ where: { id: emp.departmentId } })
      : null;
    const position = emp.positionId
      ? await this.positionRepo.findOne({ where: { id: emp.positionId } })
      : null;

    return {
      ...emp,
      departmentName: department?.name ?? null,
      positionName: position?.name ?? null,
    };
  }

  async findActiveEmployees(
    siteId?: string,
    departmentId?: string,
  ): Promise<any[]> {
    const qb = this.employeeRepo.createQueryBuilder('emp');
    qb.where('emp.status = :status', { status: 'active' });

    if (departmentId) {
      qb.andWhere('emp.departmentId = :departmentId', { departmentId });
    }

    const employees = await qb.orderBy('emp.fullName', 'ASC').getMany();

    return Promise.all(
      employees.map(async (emp) => {
        const department = emp.departmentId
          ? await this.departmentRepo.findOne({
              where: { id: emp.departmentId },
            })
          : null;
        const position = emp.positionId
          ? await this.positionRepo.findOne({ where: { id: emp.positionId } })
          : null;
        return {
          ...emp,
          departmentName: department?.name ?? null,
          positionName: position?.name ?? null,
        };
      }),
    );
  }

  async create(data: any): Promise<any> {
    const employee = this.employeeRepo.create(data);
    return this.employeeRepo.save(employee);
  }

  async update(id: string, data: any): Promise<any> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) return null;
    Object.assign(employee, data);
    return this.employeeRepo.save(employee);
  }

  async getLastEmployeeNumber(prefix: string): Promise<string | null> {
    const last = await this.employeeRepo
      .createQueryBuilder('emp')
      .where('emp.employeeNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('emp.employeeNumber', 'DESC')
      .getOne();

    return last?.employeeNumber ?? null;
  }

  async createDocument(data: any): Promise<any> {
    const document = this.documentRepo.create(data);
    return this.documentRepo.save(document);
  }

  async getDocuments(employeeId: string): Promise<any[]> {
    return this.documentRepo.find({
      where: { employeeId },
      order: { uploadedAt: 'DESC' },
    });
  }

  async createHistoryEvent(data: any): Promise<any> {
    const event = this.historyRepo.create(data);
    return this.historyRepo.save(event);
  }

  async getHistory(employeeId: string): Promise<any[]> {
    return this.historyRepo.find({
      where: { employeeId },
      order: { effectiveDate: 'DESC' },
    });
  }
}
