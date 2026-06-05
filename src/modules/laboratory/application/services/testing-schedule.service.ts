import { Injectable, Inject } from '@nestjs/common';
import { TestingSchedule } from '../../domain/entities/testing-schedule.entity';
import type { TestingScheduleRepositoryPort } from '../../domain/repositories/testing-schedule-repository.port';
import { TESTING_SCHEDULE_REPOSITORY } from '../../domain/repositories/testing-schedule-repository.port';

@Injectable()
export class TestingScheduleService {
  constructor(
    @Inject(TESTING_SCHEDULE_REPOSITORY)
    private readonly repository: TestingScheduleRepositoryPort,
  ) {}

  async findAll(options?: {
    status?: string;
    laboratoryId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.laboratoryId) filters.laboratoryId = options.laboratoryId;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<TestingSchedule | null> {
    return this.repository.findById(id);
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<TestingSchedule[]> {
    return this.repository.findByDateRange(startDate, endDate);
  }

  async findByLaboratoryAndDate(
    laboratoryId: string,
    date: string,
  ): Promise<TestingSchedule[]> {
    return this.repository.findByLaboratoryAndDate(laboratoryId, date);
  }

  async create(dto: {
    scheduleDate: string;
    timeSlot: string;
    laboratoryId: string;
    laboratoryName: string;
    testingRequestId?: string;
    testingRequestNumber?: string;
    sampleId?: string;
    sampleCode?: string;
    technicianId?: string;
    technicianName?: string;
    notes?: string;
  }): Promise<TestingSchedule> {
    const entity = new TestingSchedule({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      scheduleDate: dto.scheduleDate,
      timeSlot: dto.timeSlot,
      laboratoryId: dto.laboratoryId,
      laboratoryName: dto.laboratoryName,
      testingRequestId: dto.testingRequestId,
      testingRequestNumber: dto.testingRequestNumber,
      sampleId: dto.sampleId,
      sampleCode: dto.sampleCode,
      technicianId: dto.technicianId,
      technicianName: dto.technicianName,
      notes: dto.notes,
      status: 'scheduled',
    } as any);

    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      scheduleDate?: string;
      timeSlot?: string;
      laboratoryId?: string;
      laboratoryName?: string;
      technicianId?: string;
      technicianName?: string;
      notes?: string;
    },
  ): Promise<TestingSchedule> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Schedule not found');

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async reschedule(
    id: string,
    dto: { scheduleDate: string; timeSlot: string; notes?: string },
  ): Promise<TestingSchedule> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Schedule not found');

    existing.scheduleDate = dto.scheduleDate;
    existing.timeSlot = dto.timeSlot;
    existing.status = 'rescheduled';
    if (dto.notes) existing.notes = dto.notes;
    return this.repository.save(existing);
  }

  async complete(id: string): Promise<TestingSchedule> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Schedule not found');

    existing.status = 'completed';
    return this.repository.save(existing);
  }

  async cancel(id: string): Promise<TestingSchedule> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Schedule not found');

    existing.status = 'cancelled';
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
