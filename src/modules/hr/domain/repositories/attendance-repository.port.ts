export const ATTENDANCE_REPOSITORY = Symbol('ATTENDANCE_REPOSITORY');

export interface AttendanceRepositoryPort {
  findByEmployeeIdsAndMonth(
    employeeIds: string[],
    month: number,
    year: number,
  ): Promise<any[]>;
  findByEmployeeAndDate(employeeId: string, date: Date): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  getOvertimeHours(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<number>;
}
