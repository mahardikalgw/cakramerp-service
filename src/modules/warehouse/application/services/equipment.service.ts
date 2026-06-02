import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { EQUIPMENT_REPOSITORY } from '../../domain/repositories/equipment-repository.port';
import type { EquipmentRepositoryPort } from '../../domain/repositories/equipment-repository.port';
import type { EquipmentServicePort } from '../ports/equipment-service.port';

export interface CreateEquipmentDto {
  unitId: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  siteId?: string;
  siteName?: string;
  status?: string;
  currentHours?: number;
}

export interface UpdateEquipmentDto {
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  siteId?: string;
  siteName?: string;
  status?: string;
  currentHours?: number;
}

export interface LogMaintenanceDto {
  maintenanceDate: string;
  hoursAtMaintenance: number;
  type: string;
  description: string;
  cost: number;
  performedBy: string;
}

@Injectable()
export class EquipmentService implements EquipmentServicePort {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepo: EquipmentRepositoryPort,
  ) {}

  async findAll(filters?: {
    type?: string;
    siteId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const { data: equipments, total } =
      await this.equipmentRepo.findAll(filters);

    const today = new Date();
    const sevenDaysFromNow = new Date(
      today.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    const data = await Promise.all(
      equipments.map(async (eq: any) => {
        const schedules = await this.equipmentRepo.getMaintenanceSchedules(
          eq.id,
        );

        let maintenanceStatus = 'ok';
        for (const schedule of schedules) {
          if (schedule.nextDueAt) {
            const dueDate = new Date(schedule.nextDueAt);
            if (dueDate < today) {
              maintenanceStatus = 'overdue';
              break;
            } else if (dueDate <= sevenDaysFromNow) {
              maintenanceStatus = 'due_soon';
            }
          }
        }

        return { ...eq, maintenanceStatus };
      }),
    );

    return { data, total };
  }

  async findById(id: string): Promise<any | null> {
    const equipment = await this.equipmentRepo.findById(id);
    if (!equipment) return null;

    const schedules = await this.equipmentRepo.getMaintenanceSchedules(id);
    const recentLogs = await this.equipmentRepo.getMaintenanceLogs(id);

    return { equipment, schedules, recentLogs };
  }

  async create(dto: CreateEquipmentDto): Promise<any> {
    return this.equipmentRepo.create({
      unitId: dto.unitId,
      type: dto.type,
      brand: dto.brand,
      model: dto.model,
      year: dto.year,
      siteId: dto.siteId,
      siteName: dto.siteName,
      status: dto.status ?? 'active',
      currentHours: dto.currentHours ?? 0,
    });
  }

  async update(id: string, dto: UpdateEquipmentDto): Promise<any> {
    const equipment = await this.equipmentRepo.findById(id);
    if (!equipment) throw new BadRequestException('Equipment not found');

    return this.equipmentRepo.update(id, dto);
  }

  async logMaintenance(
    equipmentId: string,
    dto: LogMaintenanceDto,
    userId: string,
  ): Promise<any> {
    const equipment = await this.equipmentRepo.findById(equipmentId);
    if (!equipment) throw new BadRequestException('Equipment not found');

    // Create maintenance log
    const savedLog = await this.equipmentRepo.createMaintenanceLog({
      equipmentId,
      maintenanceDate: new Date(dto.maintenanceDate),
      hoursAtMaintenance: dto.hoursAtMaintenance,
      type: dto.type,
      description: dto.description,
      cost: dto.cost,
      performedBy: dto.performedBy,
      createdBy: userId,
    });

    // Update equipment currentHours
    await this.equipmentRepo.update(equipmentId, {
      currentHours: dto.hoursAtMaintenance,
    });

    // Update maintenance schedules for this equipment
    await this.equipmentRepo.updateSchedulesAfterMaintenance(
      equipmentId,
      new Date(dto.maintenanceDate),
      dto.hoursAtMaintenance,
    );

    return savedLog;
  }

  async getMaintenanceSchedules(equipmentId: string): Promise<any[]> {
    return this.equipmentRepo.getMaintenanceSchedules(equipmentId);
  }

  async getMaintenanceLogs(equipmentId: string): Promise<any[]> {
    return this.equipmentRepo.getMaintenanceLogs(equipmentId);
  }
}
