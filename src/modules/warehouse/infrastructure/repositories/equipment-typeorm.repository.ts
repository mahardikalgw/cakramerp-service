import { Injectable } from '@nestjs/common'
import { DataSource, Repository, LessThanOrEqual } from 'typeorm'
import { EquipmentRepositoryPort } from '../../domain/repositories/equipment-repository.port'
import { Equipment } from '../../domain/entities/equipment.entity'
import { MaintenanceLog } from '../../domain/entities/maintenance-log.entity'
import { MaintenanceSchedule } from '../../domain/entities/maintenance-schedule.entity'
import { EquipmentUnitTypeOrmEntity } from '../entities/equipment-unit-typeorm.entity'
import { MaintenanceLogTypeOrmEntity } from '../entities/maintenance-log-typeorm.entity'
import { MaintenanceScheduleTypeOrmEntity } from '../entities/maintenance-schedule-typeorm.entity'

@Injectable()
export class EquipmentTypeOrmRepository implements EquipmentRepositoryPort {
  private readonly equipmentRepo: Repository<EquipmentUnitTypeOrmEntity>
  private readonly logRepo: Repository<MaintenanceLogTypeOrmEntity>
  private readonly scheduleRepo: Repository<MaintenanceScheduleTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.equipmentRepo = dataSource.getRepository(EquipmentUnitTypeOrmEntity)
    this.logRepo = dataSource.getRepository(MaintenanceLogTypeOrmEntity)
    this.scheduleRepo = dataSource.getRepository(MaintenanceScheduleTypeOrmEntity)
  }

  async findAll(filters?: {
    type?: string
    siteId?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: Equipment[]; total: number }> {
    const qb = this.equipmentRepo.createQueryBuilder('eq')

    if (filters?.type) {
      qb.andWhere('eq.type = :type', { type: filters.type })
    }
    if (filters?.siteId) {
      qb.andWhere('eq.siteId = :siteId', { siteId: filters.siteId })
    }
    if (filters?.status) {
      qb.andWhere('eq.status = :status', { status: filters.status })
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    qb.orderBy('eq.unitId', 'ASC')
    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data: data.map(this.mapToEquipment), total }
  }

  async findById(id: string): Promise<Equipment | null> {
    const equipment = await this.equipmentRepo.findOne({ where: { id } })
    if (!equipment) return null

    return this.mapToEquipment(equipment)
  }

  async create(equipment: Partial<Equipment>): Promise<Equipment> {
    const entity = this.equipmentRepo.create({
      unitId: equipment.unitId,
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      year: equipment.year,
      siteId: equipment.siteId,
      siteName: equipment.siteName,
      status: equipment.status ?? 'active',
      currentHours: equipment.currentHours ?? 0,
    })

    const saved = await this.equipmentRepo.save(entity)
    return this.mapToEquipment(saved)
  }

  async update(id: string, data: Partial<Equipment>): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({ where: { id } })
    if (!equipment) throw new Error('Equipment not found')

    Object.assign(equipment, {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.siteId !== undefined && { siteId: data.siteId }),
      ...(data.siteName !== undefined && { siteName: data.siteName }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.currentHours !== undefined && { currentHours: data.currentHours }),
    })

    const saved = await this.equipmentRepo.save(equipment)
    return this.mapToEquipment(saved)
  }

  async createMaintenanceLog(log: Partial<MaintenanceLog>): Promise<MaintenanceLog> {
    const entity = this.logRepo.create({
      equipmentId: log.equipmentId,
      maintenanceDate: log.maintenanceDate,
      hoursAtMaintenance: log.hoursAtMaintenance,
      type: log.type,
      description: log.description,
      cost: log.cost,
      performedBy: log.performedBy,
      createdBy: log.createdBy,
    })

    const saved = await this.logRepo.save(entity)
    return this.mapToMaintenanceLog(saved)
  }

  async getMaintenanceSchedules(
    equipmentId: string,
  ): Promise<MaintenanceSchedule[]> {
    const schedules = await this.scheduleRepo.find({
      where: { equipmentId },
      order: { nextDueDate: 'ASC' },
    })

    return schedules.map(this.mapToMaintenanceSchedule)
  }

  async getMaintenanceLogs(equipmentId: string): Promise<MaintenanceLog[]> {
    const logs = await this.logRepo.find({
      where: { equipmentId },
      order: { maintenanceDate: 'DESC' },
    })

    return logs.map(this.mapToMaintenanceLog)
  }

  async updateSchedulesAfterMaintenance(
    equipmentId: string,
    maintenanceDate: Date,
    hoursAtMaintenance: number,
  ): Promise<void> {
    const schedules = await this.scheduleRepo.find({ where: { equipmentId } })

    for (const schedule of schedules) {
      schedule.lastDoneDate = maintenanceDate
      schedule.lastDoneHours = hoursAtMaintenance

      // Calculate next due based on interval
      if (schedule.intervalType === 'days') {
        const nextDate = new Date(maintenanceDate)
        nextDate.setDate(nextDate.getDate() + schedule.intervalValue)
        schedule.nextDueDate = nextDate
      } else if (schedule.intervalType === 'hours') {
        schedule.nextDueHours = hoursAtMaintenance + schedule.intervalValue
      } else if (schedule.intervalType === 'months') {
        const nextDate = new Date(maintenanceDate)
        nextDate.setMonth(nextDate.getMonth() + schedule.intervalValue)
        schedule.nextDueDate = nextDate
      }

      await this.scheduleRepo.save(schedule)
    }
  }

  async findDueForMaintenance(): Promise<Equipment[]> {
    const today = new Date()

    // Find equipment IDs that have schedules due today or overdue
    const dueSchedules = await this.scheduleRepo.find({
      where: { nextDueDate: LessThanOrEqual(today) },
    })

    const equipmentIds = [...new Set(dueSchedules.map((s) => s.equipmentId))]

    if (equipmentIds.length === 0) return []

    const equipments = await this.equipmentRepo
      .createQueryBuilder('eq')
      .where('eq.id IN (:...ids)', { ids: equipmentIds })
      .getMany()

    return equipments.map(this.mapToEquipment)
  }

  private mapToEquipment(entity: EquipmentUnitTypeOrmEntity): Equipment {
    return new Equipment({
      id: entity.id,
      unitId: entity.unitId,
      type: entity.type,
      brand: entity.brand,
      model: entity.model,
      year: entity.year,
      siteId: entity.siteId,
      siteName: entity.siteName,
      status: entity.status,
      currentHours: Number(entity.currentHours),
      createdAt: entity.createdAt,
    })
  }

  private mapToMaintenanceLog(
    entity: MaintenanceLogTypeOrmEntity,
  ): MaintenanceLog {
    return new MaintenanceLog({
      id: entity.id,
      equipmentId: entity.equipmentId,
      maintenanceDate: entity.maintenanceDate,
      hoursAtMaintenance: Number(entity.hoursAtMaintenance),
      type: entity.type,
      description: entity.description,
      cost: Number(entity.cost),
      performedBy: entity.performedBy,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
    })
  }

  private mapToMaintenanceSchedule(
    entity: MaintenanceScheduleTypeOrmEntity,
  ): MaintenanceSchedule {
    return new MaintenanceSchedule({
      id: entity.id,
      equipmentId: entity.equipmentId,
      intervalHours: entity.intervalValue,
      description: entity.description,
      lastPerformedAt: entity.lastDoneDate,
      nextDueAt: entity.nextDueDate,
      createdAt: entity.createdAt,
    })
  }
}
