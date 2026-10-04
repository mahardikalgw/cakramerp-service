import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const payslipLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT e.employee_number, COALESCE(e.full_name, pd.employee_name) AS employee_name,
            d.name AS department_name,
            (pr.month || '/' || pr.year) AS payroll_period,
            pd.basic_salary,
            (COALESCE(pd.site_allowance, 0) + COALESCE(pd.meal_allowance, 0) +
             COALESCE(pd.transport_allowance, 0) + COALESCE(pd.other_allowances, 0)) AS allowances,
            pd.overtime_pay, pd.gross_pay,
            pd.pph21 AS pph21_deduction,
            pd.bpjs_kesehatan_employee AS bpjs_employee_deduction,
            pd.other_deductions, pd.total_deductions, pd.net_pay
       FROM payroll_details pd
       JOIN payroll_runs pr ON pr.id = pd.payroll_run_id
       LEFT JOIN employees e ON e.id = pd.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
      WHERE pd.id = CAST($1 AS uuid)`,
    [entityId],
  );
  const p = rows[0] ?? {};
  return {
    parameters: {
      employeeNumber: p.employee_number,
      employeeName: p.employee_name,
      departmentName: p.department_name,
      payrollPeriod: p.payroll_period,
      basicSalary: p.basic_salary,
      allowances: p.allowances,
      overtimePay: p.overtime_pay,
      grossPay: p.gross_pay,
      pph21Deduction: p.pph21_deduction,
      bpjsEmployeeDeduction: p.bpjs_employee_deduction,
      otherDeductions: p.other_deductions,
      totalDeductions: p.total_deductions,
      netPay: p.net_pay,
    },
    lines: [],
  };
};
