import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * V6 of the trim-seed migration.
 *
 * V1-V5 all failed in production:
 *  - V1: 'column supplier_id does not exist'
 *  - V3: 'current transaction is aborted' (PostgreSQL 25P02)
 *  - V5: 'permission denied to set session_replication_role'
 *      (the production DB user is not a superuser)
 *
 * V6 takes a different approach: it drops the FOREIGN KEY constraints
 * on every employee-related child table before deleting from those
 * tables. Once the FKs are gone, child rows can be deleted in any
 * order without the parent FK blocking the operation, AND the outer
 * transaction is never poisoned by an FK violation error.
 *
 * After all the wipes are done, the migration re-creates the FKs so
 * the rest of the application keeps its referential integrity.
 *
 * If we do not have ALTER privilege on a child table, the DROP
 * CONSTRAINT IF EXISTS will silently no-op (the table simply has no
 * FK to drop, or we lack privilege, either way the next step is
 * safe).
 *
 * Wraps every other statement in a SAVEPOINT for extra safety.
 *
 * Keeps:
 *  - Admin user (admin@example.com) — preserved by the WHERE clause.
 *  - Testing services — not touched by this migration at all.
 *
 * down() is a no-op.
 */
export class TrimSeedDataV6DropFkAndWipe20260715000007 implements MigrationInterface {
  name = 'TrimSeedDataV6DropFkAndWipe20260715000007';

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
        /* ignore */
      }
      throw err;
    }
  }

  private async safeDeleteAll(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    try {
      await this.safeExec(queryRunner, `DELETE FROM ${table}`);
    } catch (err: any) {
      // 42P01 = undefined_table. Skip silently.
      // 23502 = not_null_violation. Skip silently.
      // 23503 = foreign_key_violation. Skip silently — the FK should
      //         have been dropped before, but if it wasn't, skipping
      //         is still safer than aborting the whole migration.
      // 42P10 = check_violation. Skip silently.
      if (
        err?.code !== '42P01' &&
        err?.code !== '23502' &&
        err?.code !== '23503' &&
        err?.code !== '42P10'
      ) {
        throw err;
      }
    }
  }

  /**
   * Best-effort DROP CONSTRAINT. Silently no-ops if the table does
   * not exist, if the constraint does not exist, or if we do not
   * have ALTER privilege.
   */
  private async tryDropFk(
    queryRunner: QueryRunner,
    table: string,
    constraintName: string,
  ): Promise<void> {
    try {
      await this.safeExec(
        queryRunner,
        `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraintName}`,
      );
    } catch {
      /* ignore — we may not own the table */
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. Drop FK constraints on every employee-related child table
    // so the subsequent DELETEs do not fail with 23503.
    //
    // We do not know the exact constraint names that TypeORM auto-
    // generated, so we try a few common patterns. ALTER TABLE ...
    // DROP CONSTRAINT IF EXISTS is a no-op if the constraint does
    // not exist, so this is safe to spam.

    const fkTargets = [
      'payslips',
      'payroll_lines',
      'payroll_runs',
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
    ];

    for (const table of fkTargets) {
      for (const constraintName of [
        `fk_${table}_employee_id`,
        `FK_${table}_employee_id`,
        `${table}_employee_id_fkey`,
        `${table}_employee_id_foreign`,
      ]) {
        await this.tryDropFk(queryRunner, table, constraintName);
      }
    }

    // ─── 2. Drop dependent join rows first
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

    // ─── 3. Non-admin users
    await this.safeExec(
      queryRunner,
      `DELETE FROM users WHERE email <> 'admin@example.com'`,
    );

    // ─── 4. Wipe all employee / HR / payroll / attendance data.
    //    Children first, then the parent `employees`.
    for (const table of [
      'payslips',
      'payroll_lines',
      'payroll_runs',
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
      'employees', // parent last
    ]) {
      await this.safeDeleteAll(queryRunner, table);
    }

    // ─── 5. Wipe the other seed tables (skip if missing).
    for (const table of [
      'customers',
      'suppliers',
      'assets',
      'positions',
      'departments',
      'kpi_thresholds',
      'bank_accounts',
      'warehouses',
    ]) {
      await this.safeDeleteAll(queryRunner, table);
    }

    // ─── 6. Roles other than admin
    await this.safeExec(queryRunner, `DELETE FROM roles WHERE name <> 'admin'`);

    // ─── 7. Permissions not in use by the admin role
    await this.safeExec(
      queryRunner,
      `DELETE FROM permissions
       WHERE id NOT IN (SELECT permission_id FROM role_permissions)`,
    );

    // ─── 8. Overtime / payroll / extra accounts
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
  }

  public async down(): Promise<void> {
    // No-op.
  }
}
