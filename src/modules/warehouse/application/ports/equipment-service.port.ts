export const EQUIPMENT_SERVICE = Symbol('EQUIPMENT_SERVICE')

export interface EquipmentServicePort {
  findAll(filters?: {
    type?: string
    siteId?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any | null>
  create(dto: any): Promise<any>
  update(id: string, dto: any): Promise<any>
  logMaintenance(equipmentId: string, dto: any, userId: string): Promise<any>
  getMaintenanceSchedules(equipmentId: string): Promise<any[]>
  getMaintenanceLogs(equipmentId: string): Promise<any[]>
}
