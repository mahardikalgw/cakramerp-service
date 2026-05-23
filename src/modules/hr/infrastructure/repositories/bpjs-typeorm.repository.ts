import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { BpjsRepositoryPort } from '../../domain/repositories/bpjs-repository.port'
import { BpjsEnrollmentTypeOrmEntity } from '../entities/bpjs-enrollment-typeorm.entity'

@Injectable()
export class BpjsTypeOrmRepository implements BpjsRepositoryPort {
  private readonly bpjsEnrollmentRepo: Repository<BpjsEnrollmentTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.bpjsEnrollmentRepo = dataSource.getRepository(BpjsEnrollmentTypeOrmEntity)
  }

  async findActiveEnrollments(): Promise<any[]> {
    return this.bpjsEnrollmentRepo.find({
      where: { isActive: true },
    })
  }

  async findByEmployeeId(employeeId: string): Promise<any | null> {
    return this.bpjsEnrollmentRepo.findOne({
      where: { employeeId },
    })
  }
}
