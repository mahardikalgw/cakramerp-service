export const POSITION_SERVICE = Symbol('POSITION_SERVICE')

export interface PositionServicePort {
  findAll(filters?: any): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any>
  create(dto: any): Promise<any>
  update(id: string, dto: any): Promise<any>
  delete(id: string): Promise<void>
}
