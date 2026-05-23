export const THR_SERVICE = Symbol('THR_SERVICE')

export interface ThrServicePort {
  getRecords(year: number): Promise<any[]>
  calculate(year: number): Promise<{ calculated: number; excluded: number }>
  confirm(id: string, userId: string): Promise<any>
}
