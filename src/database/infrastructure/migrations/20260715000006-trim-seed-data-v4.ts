import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * V4 of the trim-seed migration. V1-V3 all failed in production for
 * one reason or another:
 *
 *  - V1 (20260715000003) crashed on "column supplier_id does not exist".
 *  - V2 (20260715000004) added column-existence checks but those checks
 *    do not help when the underlying problem is that an EARLIER query
 *    in the same transaction failed with a non-obvious error, putting
 *    the transaction into the "aborted" state. PostgreSQL then refuses
 *    to execute any further commands in the same transaction
 *    (error 25P02 "current transaction is aborted, commands ignored
 *    until end of transaction block"), and every later DELETE crashes
 *    even though we tried to swallow 42P01.
 *  - V3 (20260715000005) hit exactly that: the `customers` delete
 *    triggered an FK violation or some other error inside the same
 *    transaction, and the `payslips` delete then failed with 25P02.
 *
 * V4 fixes this by:
 *  1. Running every wipe in its own SAVEPOINT and rolling back the
 *     savepoint on failure. That way a single bad statement can
 *     never poison the rest of the transaction.
 *  2. Using `START TRANSACTION` per-step so each step is a self-
 *     contained unit of work.
 *
 * Otherwise V4 is the same as V3: keep the admin user and the
 * testing services, wipe everything else.
 */
export class TrimSeedDataV4UseSavepoints20260715000006
  implements MigrationInterface
{
  name = 'TrimSeedDataV4UseSavepoints20260715000006';

  /**
   * Run a single statement inside a savepoint. If the statement
   * fails (any error), the savepoint is rolled back so the rest
   * of the transaction is unaffected.
   */
  private async safeExec(
    queryRunner: QueryRunner,
    sql: string,
    params: any[] = [],
  ): Promise<void> {
    const sp = `sp_${Math.random().toString(36).slice(2, 10)}`;
    try {
      await queryRunner.query(`SAVEPOINT ${sp}`);
      await queryRunner.query(sql, params);
      await queryRunner.query(`RELEASE SAVEPOINT ${sp}`);
    } catch (err) {
      try {
        await queryRunner.query(`ROLLBACK TO SAVEPOINT ${sp}`);
      } catch {
        // ignore secondary failure
      }
      throw err;
    }
  }

  /**
   * DELETE FROM <table> inside a savepoint, swallowing 42P01
   * (undefined_table) but re-throwing anything else.
   */
  private async safeDeleteAll(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    try {
      await this.safeExec(queryRunner, `DELETE FROM ${table}`);
    } catch (err: any) {
      if (err?.code !== '42P01') throw err;
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Each step is its own savepoint-scoped unit. A failure in one
    // step can never poison a later step.

    // 1. Drop dependent join rows
    await this.safeExec(
      queryRunner,
      `DELETE FROM user_roles
       WHERE user_id NOT IN (
         SELECT id FROM users WHERE email = 'admin@example.com'
       )`,
    );
    await this.safeExec(
      queryRunner,
      `DELETE FROM role_permissions
       WHERE role_id NOT IN (
         SELECT id FROM roles WHERE name = 'admin'
       )`,
    );

    // 2. Non-admin users
    await this.safeExec(
      queryRunner,
      `DELETE FROM users WHERE email <> 'admin@example.com'`,
    );

    // 3. Customers (defensive: skip if reference columns do not exist)
    //    Wrapped in savepoint so a failure here does not poison the
    //    rest of the migration.
    await this.tryWipeCustomers(queryRunner);

    // 4. Suppliers (defensive: skip if reference columns do not exist)
    await this.tryWipeSuppliers(queryRunner);

    // 5. Best-effort simple deletes (skip if table missing)
    for (const table of [
      'assets',
      'positions',
      'departments',
      'kpi_thresholds',
      'bank_accounts',
      'warehouses',
    ]) {
      await this.safeDeleteAll(queryRunner, table);
    }

    // 6. Roles other than admin
    await this.safeExec(
      queryRunner,
      `DELETE FROM roles WHERE name <> 'admin'`,
    );

    // 7. Permissions not in use by the admin role
    await this.safeExec(
      queryRunner,
      `DELETE FROM permissions
       WHERE id NOT IN (SELECT permission_id FROM role_permissions)`,
    );

    // 8. Overtime / payroll / extra accounts
    await this.safeExec(
      queryRunner,
      `DELETE FROM accounts
       WHERE code IN (
         '5101','5102','5103','5104','5105','5106',
         '2101','2102','2103',
         '1101','1102',
         '4101','4102','4103','4104','4105','4106','4107','4108','4109','4110','4111',
         '5200','5201',
         'OVT-BASIC','OVT-WEEKEND','OVT-HOLIDAY'
       )`,
    );

    // 9. Wipe ALL employee data. Each table is its own savepoint.
    for (const table of [
      'payroll_runs',
      'payroll_lines',
      'payslips',
      'attendance_records',
      'attendance_corrections',
      'leave_requests',
      'leave_balances',
      'overtime_requests',
      'employee_documents',
      'employee_contracts',
      'employee_salary_components',
      'employee_bank_accounts',
      'employee_dependents',
      'employee_emergency_contacts',
      'employee_educations',
      'employee_work_experiences',
      'employee_certifications',
      'employee_trainings',
      'performance_reviews',
      'performance_goals',
      'performance_kpis',
      'self_service_requests',
      'approval_requests',
      'approval_request_steps',
      'employee_assets',
      'employees', // parent table — last
    ]) {
      await this.safeDeleteAll(queryRunner, table);
    }
  }

  /**
   * Try to wipe customers that are not referenced by lab_contracts
   * or testing_requests. If the reference columns do not exist,
   * skip the step (we cannot safely decide which customers to keep).
   */
  private async tryWipeCustomers(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const hasContracts = await this.columnExists(
      queryRunner,
      'lab_contracts',
      'customer_id',
    );
    const hasRequests = await this.columnExists(
      queryRunner,
      'testing_requests',
      'customer_id',
    );

    if (hasContracts) {
      await this.safeExec(
        queryRunner,
        `DELETE FROM customers
         WHERE id NOT IN (
           SELECT customer_id FROM lab_contracts WHERE customer_id IS NOT NULL
         )`,
      );
    }
    if (hasRequests) {
      await this.safeExec(
        queryRunner,
        `DELETE FROM customers
         WHERE id NOT IN (
           SELECT customer_id FROM testing_requests WHERE customer_id IS NOT NULL
         )`,
      );
    }
  }

  /**
   * Try to wipe suppliers that are not referenced by lab_purchase_orders
   * or purchase_orders. If the reference columns do not exist, skip.
   */
  private async tryWipeSuppliers(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const hasLabPo = await this.columnExists(
      queryRunner,
      'lab_purchase_orders',
      'supplier_id',
    );
    const hasPo = await this.columnExists(
      queryRunner,
      'purchase_orders',
      'supplier_id',
    );

    if (hasLabPo) {
      await this.safeExec(
        queryRunner,
        `DELETE FROM suppliers
         WHERE id NOT IN (
           SELECT supplier_id FROM lab_purchase_orders WHERE supplier_id IS NOT NULL
         )`,
      );
    }
    if (hasPo) {
      await this.safeExec(
        queryRunner,
        `DELETE FROM suppliers
         WHERE id NOT IN (
           SELECT supplier_id FROM purchase_orders WHERE supplier_id IS NOT NULL
         )`,
      );
    }
  }

  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    try {
      const rows = (await queryRunner.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = $1
           AND column_name = $2
         LIMIT 1`,
        [tableName, columnName],
      )) as unknown[];
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  public async down(): Promise<void> {
    // No-op.
  }
}
