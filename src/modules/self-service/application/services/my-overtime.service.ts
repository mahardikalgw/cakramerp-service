import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MyOvertimeServicePort } from '../ports/my-overtime-service.port';
import { OVERTIME_REQUEST_REPOSITORY } from '../../domain/repositories/self-service-repository.port';
import type { OvertimeRequestRepositoryPort } from '../../domain/repositories/self-service-repository.port';
import { GlPostingQueueTypeOrmEntity } from '../../../finance/infrastructure/entities/gl-posting-queue-typeorm.entity';
import { EmployeeTypeOrmEntity } from '../../../hr/infrastructure/entities/employee-typeorm.entity';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';

@Injectable()
export class MyOvertimeService implements MyOvertimeServicePort {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(OVERTIME_REQUEST_REPOSITORY)
    private readonly overtimeRequestRepo: OvertimeRequestRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
  ) {}

  async getRequests(
    employeeId: string,
    filters?: { status?: string },
  ): Promise<any[]> {
    return this.overtimeRequestRepo.findByEmployeeId(employeeId, filters);
  }

  async createRequest(
    employeeId: string,
    data: {
      date: string;
      startTime: string;
      endTime: string;
      reason: string;
      projectReference?: string;
    },
  ): Promise<any> {
    const hours = this.calculateHours(data.startTime, data.endTime);
    if (hours <= 0) {
      throw new BadRequestException('End time must be after start time');
    }

    const request = await this.overtimeRequestRepo.create({
      employeeId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      hours,
      reason: data.reason,
      projectReference: data.projectReference || null,
      status: 'pending',
    });

    void this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.OVERTIME_REQUEST,
      entityId: request.id,
      tenantId: 'default',
      requestedBy: employeeId,
      outputFormat: 'pdf',
    });

    return request;
  }

  async getPendingForSupervisor(supervisorId: string): Promise<any[]> {
    return this.overtimeRequestRepo.findPendingBySupervisor(supervisorId);
  }

  async approve(requestId: string, approverId: string): Promise<any> {
    const request = await this.overtimeRequestRepo.findById(requestId);
    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const updated = await this.overtimeRequestRepo.update(requestId, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
    });

    await this.createGlPostingForOvertime(request);

    return updated;
  }

  async reject(
    requestId: string,
    approverId: string,
    reason: string,
  ): Promise<any> {
    const request = await this.overtimeRequestRepo.findById(requestId);
    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    return this.overtimeRequestRepo.update(requestId, {
      status: 'rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
    });
  }

  private async createGlPostingForOvertime(
    overtimeRequest: any,
  ): Promise<void> {
    const employeeRepo = this.dataSource.getRepository(EmployeeTypeOrmEntity);
    const glPostingRepo = this.dataSource.getRepository(
      GlPostingQueueTypeOrmEntity,
    );

    const employee = await employeeRepo.findOne({
      where: { id: overtimeRequest.employeeId },
    });
    if (!employee) return;

    const hourlyRate = Number(employee.basicSalary) / 173;
    const amount =
      Math.round(Number(overtimeRequest.hours) * hourlyRate * 100) / 100;

    const posting = glPostingRepo.create({
      sourceType: 'overtime',
      sourceId: overtimeRequest.id,
      sourceNumber: `OT-${overtimeRequest.id.substring(0, 8)}`,
      eventType: 'overtime_approved',
      amount,
      description: `Overtime approved for ${employee.fullName}: ${overtimeRequest.hours} hours`,
      suggestedLines: [
        {
          accountCode: '5103',
          accountName: 'Overtime Expense',
          direction: 'DR',
          amount,
        },
        {
          accountCode: '2320',
          accountName: 'Overtime Payable',
          direction: 'CR',
          amount,
        },
      ],
      status: 'pending',
    });

    await glPostingRepo.save(posting);
  }

  private calculateHours(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) return 0;

    return Math.round((diffMinutes / 60) * 100) / 100;
  }
}
