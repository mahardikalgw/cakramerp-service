import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const leaveRequestLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT lr.start_date, lr.end_date, lr.working_days, lr.reason, lr.status,
            lr.created_at, lt.name AS leave_type_name,
            e.full_name AS employee_name, e.employee_number
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       JOIN employees e ON e.id = lr.employee_id
      WHERE lr.id = CAST($1 AS uuid)`,
    [entityId],
  );
  const p = rows[0] ?? {};
  return {
    parameters: {
      startDate: p.start_date,
      endDate: p.end_date,
      workingDays: p.working_days,
      reason: p.reason,
      status: p.status,
      createdAt: p.created_at,
      leaveTypeName: p.leave_type_name,
      employeeName: p.employee_name,
      employeeNumber: p.employee_number,
    },
    lines: [],
  };
};
