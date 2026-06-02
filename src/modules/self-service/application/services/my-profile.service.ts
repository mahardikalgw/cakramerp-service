import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MyProfileServicePort } from '../ports/my-profile-service.port';
import { PROFILE_CHANGE_REQUEST_REPOSITORY } from '../../domain/repositories/self-service-repository.port';
import type { ProfileChangeRequestRepositoryPort } from '../../domain/repositories/self-service-repository.port';
import { EmployeeTypeOrmEntity } from '../../../hr/infrastructure/entities/employee-typeorm.entity';
import { EmployeeDocumentTypeOrmEntity } from '../../../hr/infrastructure/entities/employee-document-typeorm.entity';

const WHITELISTED_FIELDS = [
  'phone',
  'address',
  'emergencyContact',
  'bankAccountNumber',
  'bankName',
];

@Injectable()
export class MyProfileService implements MyProfileServicePort {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(PROFILE_CHANGE_REQUEST_REPOSITORY)
    private readonly profileChangeRequestRepo: ProfileChangeRequestRepositoryPort,
  ) {}

  async getEmployeeIdFromUserId(userId: string): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT employee_id FROM users WHERE id = $1`,
      [userId],
    );
    if (!result || result.length === 0 || !result[0].employee_id) {
      throw new NotFoundException('Employee not linked to this user account');
    }
    return result[0].employee_id as string;
  }

  async getProfile(employeeId: string): Promise<any> {
    const employeeRepo = this.dataSource.getRepository(EmployeeTypeOrmEntity);
    const employee = await employeeRepo.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const documents = await this.getDocuments(employeeId);

    return {
      ...employee,
      documents,
    };
  }

  async updateProfile(employeeId: string, data: any): Promise<any> {
    const invalidFields = Object.keys(data).filter(
      (key) => !WHITELISTED_FIELDS.includes(key),
    );
    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Cannot directly update fields: ${invalidFields.join(', ')}. Please submit a change request instead.`,
      );
    }

    const employeeRepo = this.dataSource.getRepository(EmployeeTypeOrmEntity);
    const employee = await employeeRepo.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    Object.assign(employee, data);
    return employeeRepo.save(employee);
  }

  async createChangeRequest(
    employeeId: string,
    data: {
      fieldName: string;
      oldValue: string;
      newValue: string;
      reason: string;
    },
  ): Promise<any> {
    return this.profileChangeRequestRepo.create({
      employeeId,
      fieldName: data.fieldName,
      oldValue: data.oldValue,
      newValue: data.newValue,
      reason: data.reason,
      status: 'pending',
    });
  }

  async getDocuments(employeeId: string): Promise<any[]> {
    const docRepo = this.dataSource.getRepository(
      EmployeeDocumentTypeOrmEntity,
    );
    return docRepo.find({
      where: { employeeId },
      order: { uploadedAt: 'DESC' },
    });
  }

  async getDocumentDownloadUrl(
    employeeId: string,
    documentId: string,
  ): Promise<string> {
    const docRepo = this.dataSource.getRepository(
      EmployeeDocumentTypeOrmEntity,
    );
    const doc = await docRepo.findOne({
      where: { id: documentId, employeeId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const expiry = Date.now() + 3600 * 1000; // 1 hour expiry
    return `${doc.filePath}?expires=${expiry}`;
  }
}
