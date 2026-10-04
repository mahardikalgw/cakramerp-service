import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const overtimeRequestLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT otr.date, otr.start_time, otr.end_time, otr.hours, otr.reason,
            otr.status, otr.project_reference, otr.created_at,
            e.full_name AS employee_name, e.employee_number
       FROM overtime_requests otr
       JOIN employees e ON e.id = otr.employee_id
      WHERE otr.id = CAST($1 AS uuid)`,
    [entityId],
  );
  const p = rows[0] ?? {};
  return {
    parameters: {
      date: p.date,
      startTime: p.start_time,
      endTime: p.end_time,
      hours: p.hours,
      reason: p.reason,
      status: p.status,
      projectReference: p.project_reference,
      createdAt: p.created_at,
      employeeName: p.employee_name,
      employeeNumber: p.employee_number,
    },
    lines: [],
  };
};
