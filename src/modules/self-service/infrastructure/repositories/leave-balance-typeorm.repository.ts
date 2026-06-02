import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LeaveBalanceRepositoryPort } from '../../domain/repositories/self-service-repository.port';
import { LeaveBalanceTypeOrmEntity } from '../entities/leave-balance-typeorm.entity';

@Injectable()
export class LeaveBalanceTypeOrmRepository implements LeaveBalanceRepositoryPort {
  private readonly repo: Repository<LeaveBalanceTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(LeaveBalanceTypeOrmEntity);
  }

  async findByEmployeeAndYear(
    employeeId: string,
    year: number,
  ): Promise<any[]> {
    return this.repo.find({
      where: { employeeId, year },
    });
  }

  async findByEmployeeTypeAndYear(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<any | null> {
    return this.repo.findOne({
      where: { employeeId, leaveTypeId, year },
    });
  }

  async create(data: any): Promise<any> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: any): Promise<any> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    Object.assign(entity, data);
    return this.repo.save(entity);
  }
}
