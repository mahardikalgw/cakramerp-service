export const PAYROLL_REPOSITORY = Symbol('PAYROLL_REPOSITORY')

export interface PayrollRepositoryPort {
  findRunByMonthYear(month: number, year: number): Promise<any | null>
  findRunById(id: string): Promise<any | null>
  findAllRuns(filters?: { year?: number; status?: string; page?: number; limit?: number }): Promise<{ data: any[]; total: number }>
  createRun(data: any): Promise<any>
  updateRun(id: string, data: any): Promise<any>
  deleteRun(id: string): Promise<void>
  createDetail(data: any): Promise<any>
  findDetailsByRunId(runId: string): Promise<any[]>
  deleteDetailsByRunId(runId: string): Promise<void>
}
