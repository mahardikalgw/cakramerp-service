import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

const TESTING_REQUEST_SQL = `SELECT tr.request_number, tr.project_name,
    tr.project_location, tr.status, tr.schedule_date, tr.notes, tr.created_at,
    tr.assigned_laboran_name, tr.assigned_at,
    c.name AS customer_name, c.address AS customer_address,
    c.phone AS customer_phone, c.email AS customer_email,
    tsv.name AS service_name, tsv.code AS service_code,
    trl.sample_quantity, trl.notes AS line_notes
  FROM testing_requests tr
  JOIN customers c ON c.id = tr.customer_id
  LEFT JOIN testing_request_lines trl ON trl.testing_request_id = tr.id
  LEFT JOIN testing_services tsv ON tsv.id = trl.testing_service_id
 WHERE tr.id = CAST($1 AS uuid)
 ORDER BY trl.created_at`;

/**
 * The laboratory daily report is generated with the daily report id as
 * `entityId`, but the report content joins `testing_requests`. Resolve the
 * owning testing request first, then load the report data.
 */
async function loadLabReport(ds: any, entityId: string) {
  const reportRows = await ds.query(
    `SELECT testing_request_id FROM daily_reports WHERE id = CAST($1 AS uuid)`,
    [entityId],
  );
  const requestId = reportRows[0]?.testing_request_id ?? entityId;
  const rows = await ds.query(TESTING_REQUEST_SQL, [requestId]);
  const first = rows[0] ?? {};
  return {
    parameters: {
      requestNumber: first.request_number,
      projectName: first.project_name,
      projectLocation: first.project_location,
      status: first.status,
      scheduleDate: first.schedule_date,
      notes: first.notes,
      createdAt: first.created_at,
      assignedLaboranName: first.assigned_laboran_name,
      assignedAt: first.assigned_at,
      customerName: first.customer_name,
      customerAddress: first.customer_address,
      customerPhone: first.customer_phone,
      customerEmail: first.customer_email,
    },
    lines: rows.map((r: any) => ({
      serviceName: r.service_name,
      serviceCode: r.service_code,
      sampleQuantity: r.sample_quantity,
      lineNotes: r.line_notes,
    })),
  };
}

export const labDraftReportLoader: SqlViewLoader = (ds, entityId) =>
  loadLabReport(ds, entityId);

export const labFinalReportLoader: SqlViewLoader = (ds, entityId) =>
  loadLabReport(ds, entityId);
