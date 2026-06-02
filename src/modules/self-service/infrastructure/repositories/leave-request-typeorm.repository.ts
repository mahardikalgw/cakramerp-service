import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LeaveRequestRepositoryPort } from '../../domain/repositories/self-service-repository.port';
import { LeaveRequestTypeOrmEntity } from '../entities/leave-request-typeorm.entity';

@Injectable()
export class LeaveRequestTypeOrmRepository implements LeaveRequestRepositoryPort {
  private readonly repo: Repository<LeaveRequestTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(LeaveRequestTypeOrmEntity);
  }

  async create(data: any): Promise<any> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findByEmployeeId(
    employeeId: string,
    filters?: { status?: string; year?: number },
  ): Promise<any[]> {
    const qb = this.repo.createQueryBuilder('lr');
    qb.where('lr.employeeId = :employeeId', { employeeId });

    if (filters?.status) {
      qb.andWhere('lr.status = :status', { status: filters.status });
    }
    if (filters?.year) {
      qb.andWhere('EXTRACT(YEAR FROM lr.startDate) = :year', {
        year: filters.year,
      });
    }

    return qb.orderBy('lr.createdAt', 'DESC').getMany();
  }

  async findById(id: string): Promise<any | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, data: any): Promise<any> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async findPending(): Promise<any[]> {
    return this.repo.find({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingByApprover(_approverId: string): Promise<any[]> {
    // For now, return all pending leave requests
    // TODO: Filter by approver when supervisor hierarchy is implemented
    return this.repo.find({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }
}
