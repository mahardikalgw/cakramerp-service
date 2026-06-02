import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DiscrepancyReportRepositoryPort } from '../../domain/repositories/self-service-repository.port';
import { DiscrepancyReportTypeOrmEntity } from '../entities/discrepancy-report-typeorm.entity';

@Injectable()
export class DiscrepancyReportTypeOrmRepository implements DiscrepancyReportRepositoryPort {
  private readonly repo: Repository<DiscrepancyReportTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(DiscrepancyReportTypeOrmEntity);
  }

  async create(data: any): Promise<any> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findByEmployeeId(employeeId: string): Promise<any[]> {
    return this.repo.find({
      where: { employeeId },
      order: { createdAt: 'DESC' },
    });
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
}
