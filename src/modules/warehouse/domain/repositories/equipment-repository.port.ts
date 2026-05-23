import { Equipment } from '../entities/equipment.entity'
import { MaintenanceLog } from '../entities/maintenance-log.entity'
import { MaintenanceSchedule } from '../entities/maintenance-schedule.entity'

export const EQUIPMENT_REPOSITORY = Symbol('EQUIPMENT_REPOSITORY')

export interface EquipmentRepositoryPort {
  findAll(filters?: {
    type?: string
    siteId?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: Equipment[]; total: number }>
  findById(id: string): Promise<Equipment | null>
  create(equipment: Partial<Equipment>): Promise<Equipment>
  update(id: string, data: Partial<Equipment>): Promise<Equipment>
  createMaintenanceLog(log: Partial<MaintenanceLog>): Promise<MaintenanceLog>
  getMaintenanceSchedules(equipmentId: string): Promise<MaintenanceSchedule[]>
  getMaintenanceLogs(equipmentId: string): Promise<MaintenanceLog[]>
  updateSchedulesAfterMaintenance(
    equipmentId: string,
    maintenanceDate: Date,
    hoursAtMaintenance: number,
  ): Promise<void>
  findDueForMaintenance(): Promise<Equipment[]>
}
