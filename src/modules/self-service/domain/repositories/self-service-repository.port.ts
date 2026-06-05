export const PROFILE_CHANGE_REQUEST_REPOSITORY = Symbol(
  'PROFILE_CHANGE_REQUEST_REPOSITORY',
);
export const DISCREPANCY_REPORT_REPOSITORY = Symbol(
  'DISCREPANCY_REPORT_REPOSITORY',
);
export const LEAVE_TYPE_REPOSITORY = Symbol('LEAVE_TYPE_REPOSITORY');
export const LEAVE_BALANCE_REPOSITORY = Symbol('LEAVE_BALANCE_REPOSITORY');
export const LEAVE_REQUEST_REPOSITORY = Symbol('LEAVE_REQUEST_REPOSITORY');
export const SHIFT_SCHEDULE_REPOSITORY = Symbol('SHIFT_SCHEDULE_REPOSITORY');
export const OVERTIME_REQUEST_REPOSITORY = Symbol(
  'OVERTIME_REQUEST_REPOSITORY',
);

export interface ProfileChangeRequestRepositoryPort {
  create(data: any): Promise<any>;
  findByEmployeeId(employeeId: string): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  findPending(): Promise<any[]>;
}

export interface DiscrepancyReportRepositoryPort {
  create(data: any): Promise<any>;
  findByEmployeeId(employeeId: string): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  findPending(): Promise<any[]>;
}

export interface LeaveTypeRepositoryPort {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findActive(): Promise<any[]>;
}

export interface LeaveBalanceRepositoryPort {
  findByEmployeeAndYear(employeeId: string, year: number): Promise<any[]>;
  findByEmployeeTypeAndYear(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
}

export interface LeaveRequestRepositoryPort {
  create(data: any): Promise<any>;
  findByEmployeeId(
    employeeId: string,
    filters?: { status?: string; year?: number },
  ): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  findPending(): Promise<any[]>;
  findPendingByApprover(approverId?: string): Promise<any[]>;
}

export interface ShiftScheduleRepositoryPort {
  findByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]>;
  create(data: any): Promise<any>;
  createMany(data: any[]): Promise<any[]>;
}

export interface OvertimeRequestRepositoryPort {
  create(data: any): Promise<any>;
  findByEmployeeId(
    employeeId: string,
    filters?: { status?: string },
  ): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  findPendingBySupervisor(supervisorId?: string): Promise<any[]>;
}
