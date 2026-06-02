export const ATTENDANCE_SERVICE = Symbol('ATTENDANCE_SERVICE');

export interface AttendanceServicePort {
  getMonthlyGrid(
    month: number,
    year: number,
    siteId?: string,
    departmentId?: string,
  ): Promise<any[]>;
  getSummary(
    month: number,
    year: number,
    siteId?: string,
    departmentId?: string,
  ): Promise<any[]>;
  recordAttendance(dto: any): Promise<any>;
  importCsv(lines: any[]): Promise<{ imported: number; flaggedLate: number }>;
  exportReport(month: number, year: number): Promise<string>;
}
