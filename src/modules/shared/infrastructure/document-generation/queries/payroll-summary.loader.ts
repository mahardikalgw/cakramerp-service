import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const payrollSummaryLoader: SqlViewLoader = async (ds, entityId) => {
  const runRows = await ds.query(
    `SELECT month, year, total_gross, total_net, total_employees
       FROM payroll_runs WHERE id = CAST($1 AS uuid)`,
    [entityId],
  );
  const rows = await ds.query(
    `SELECT e.employee_number, COALESCE(e.full_name, pd.employee_name) AS employee_name,
            d.name AS department_name, pd.gross_pay,
            pd.total_deductions, pd.net_pay
       FROM payroll_details pd
       LEFT JOIN employees e ON e.id = pd.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
      WHERE pd.payroll_run_id = CAST($1 AS uuid)
      ORDER BY employee_name`,
    [entityId],
  );
  const sum = (key: string) =>
    rows.reduce((total: number, r: any) => total + Number(r[key] ?? 0), 0);
  const run = runRows[0] ?? {};
  return {
    parameters: {
      payrollPeriod:
        run.month && run.year ? `${run.month}/${run.year}` : undefined,
      totalEmployees: run.total_employees ?? rows.length,
      totalGross: run.total_gross ?? sum('gross_pay'),
      totalDeductions: sum('total_deductions'),
      totalNet: run.total_net ?? sum('net_pay'),
    },
    lines: rows.map((r: any) => ({
      employeeNumber: r.employee_number,
      employeeName: r.employee_name,
      departmentName: r.department_name,
      grossPay: r.gross_pay,
      totalDeductions: r.total_deductions,
      netPay: r.net_pay,
    })),
  };
};
