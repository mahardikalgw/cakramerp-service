import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProfileChangeRequestRepositoryPort } from '../../domain/repositories/self-service-repository.port';
import { ProfileChangeRequestTypeOrmEntity } from '../entities/profile-change-request-typeorm.entity';

@Injectable()
export class ProfileChangeRequestTypeOrmRepository implements ProfileChangeRequestRepositoryPort {
  private readonly repo: Repository<ProfileChangeRequestTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProfileChangeRequestTypeOrmEntity);
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
