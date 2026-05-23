export const MY_OVERTIME_SERVICE = Symbol('MY_OVERTIME_SERVICE')

export interface MyOvertimeServicePort {
  getRequests(employeeId: string, filters?: { status?: string }): Promise<any[]>
  createRequest(employeeId: string, data: { date: string; startTime: string; endTime: string; reason: string; projectReference?: string }): Promise<any>
  getPendingForSupervisor(supervisorId: string): Promise<any[]>
  approve(requestId: string, approverId: string): Promise<any>
  reject(requestId: string, approverId: string, reason: string): Promise<any>
}
