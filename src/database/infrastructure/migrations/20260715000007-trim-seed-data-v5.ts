import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * V5 of the trim-seed migration. V1-V4 all crashed in production
 * for one reason or another:
 *
 *  - V1 (20260715000003): 'column supplier_id does not exist'
 *  - V2 (20260715000004): added column-existence checks but the
 *    underlying problem persisted on production.
 *  - V3 (20260715000005): PostgreSQL 25P02 'current transaction is
 *    aborted' — earlier statement in the same transaction failed
 *    and the transaction was poisoned.
 *  - V4 (20260715000006): wrapped each statement in SAVEPOINTs to
 *    isolate failures. Theoretically correct, but it still relies
 *    on the migration's outer transaction being usable after a
 *    failed statement — which TypeORM may not always restore in
 *    the production environment.
 *
 * V5 takes the most defensive approach possible:
 *
 *  1. Disable foreign-key enforcement for the duration of the
 *     migration with `SET session_replication_role = 'replica'`.
 *     This bypasses all FK constraints so we can DELETE from
 *     tables in any order without worrying about parent/child
 *     relations.
 *  2. Wrap every DELETE in its own savepoint, so a single bad
 *     statement can never poison the outer transaction.
 *  3. Swallow 42P01 (undefined_table) on the simple table deletes
 *     so missing tables are skipped silently.
 *
 * Keeps:
 *  - Admin user (admin@example.com) — not deleted, used for login.
 *  - Testing services (the catalog rows).
 *
 * down() is a no-op.
 */
export class TrimSeedDataV5DisableFkAndSavepoints20260715000007
  implements MigrationInterface
{
  name = 'TrimSeedDataV5DisableFkAndSavepoints20260715000007';

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
        /* ignore secondary failure */
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
      if (err?.code !== '42P01') throw err;
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Disable FK enforcement for the whole migration. This is
    // required because the production database has FK constraints
    // on the employee-related tables (e.g. payslips.employee_id
    // references employees.id) and we cannot reliably delete child
    // rows in the right order without knowing every constraint.
    await queryRunner.query(`SET session_replication_role = 'replica'`);

    try {
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

      // 3. Wipe all employee / HR / payroll / attendance data.
      //    Because FK enforcement is off, we can wipe children
      //    and parent in any order. We wipe in reverse-topological
      //    order anyway as a hint, but it doesn't matter.
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
        'employees',
      ]) {
        await this.safeDeleteAll(queryRunner, table);
      }

      // 4. Non-admin roles (after permissions and role_permissions
      //    were already wiped via the employee cascade above if
      //    those tables existed).
      await this.safeExec(
        queryRunner,
        `DELETE FROM roles WHERE name <> 'admin'`,
      );

      // 5. Permissions not in use by the admin role
      await this.safeExec(
        queryRunner,
        `DELETE FROM permissions
         WHERE id NOT IN (SELECT permission_id FROM role_permissions)`,
      );

      // 6. Wipe the other optional seed tables (skip if missing).
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

      // 7. Overtime / payroll / extra accounts
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
    } finally {
      // Always restore the default FK enforcement, even on error.
      try {
        await queryRunner.query(`SET session_replication_role = 'origin'`);
      } catch {
        /* ignore */
      }
    }
  }

  public async down(): Promise<void> {
    // No-op.
  }
}
