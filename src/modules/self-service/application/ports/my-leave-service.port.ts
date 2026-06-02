export const MY_LEAVE_SERVICE = Symbol('MY_LEAVE_SERVICE');

export interface MyLeaveServicePort {
  getLeaveBalance(employeeId: string, year: number): Promise<any[]>;
  getLeaveHistory(
    employeeId: string,
    filters?: { status?: string; year?: number },
  ): Promise<any[]>;
  applyLeave(
    employeeId: string,
    data: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason: string;
      attachmentPath?: string;
    },
  ): Promise<any>;
  approveLeave(
    employeeId: string,
    leaveRequestId: string,
    approverId: string,
  ): Promise<any>;
  rejectLeave(
    employeeId: string,
    leaveRequestId: string,
    approverId: string,
    rejectionReason: string,
  ): Promise<any>;
  cancelLeave(employeeId: string, leaveRequestId: string): Promise<any>;
}
