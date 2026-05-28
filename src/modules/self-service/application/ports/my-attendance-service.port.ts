export const MY_ATTENDANCE_SERVICE = Symbol('MY_ATTENDANCE_SERVICE')

export interface MyAttendanceServicePort {
  getMonthlyAttendance(employeeId: string, month: number, year: number): Promise<any>
  getTodayAttendance(employeeId: string): Promise<any>
  clockIn(employeeId: string): Promise<any>
  clockOut(employeeId: string): Promise<any>
  flagDiscrepancy(employeeId: string, data: { attendanceDate: string; description: string }): Promise<any>
}
