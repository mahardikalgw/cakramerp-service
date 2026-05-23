export const MY_SCHEDULE_SERVICE = Symbol('MY_SCHEDULE_SERVICE')

export interface MyScheduleServicePort {
  getSchedule(employeeId: string, weeks?: number): Promise<any[]>
}
