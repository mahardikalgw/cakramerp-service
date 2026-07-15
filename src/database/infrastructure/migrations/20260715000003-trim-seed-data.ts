import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Trim the database down to the bare minimum seed data.
 *
 * Keep:
 *  - Admin user (admin@example.com) seeded by 20250519000002-seed-admin-data
 *  - Testing services seeded by 20260611000002-seed-testing-services
 *
 * Wipe:
 *  - All other users (including the test customer user from
 *    20260608000005-seed-test-customer-user)
 *  - All non-admin customer records
 *  - All supplier records
 *  - All department / position records (seed-departments-and-positions)
 *  - All asset records (seed-assets)
 *  - All KPI thresholds (seed-module-data)
 *  - All warehouses (seed-module-data)
 *  - All bank accounts (seed-module-data)
 *  - All non-admin roles + the role_permissions / user_roles links that
 *    reference them (only the admin's role and its links are kept)
 *  - All non-admin permissions (keeping only those used by the admin role
 *    and the testing-services seed data)
 *  - All overtime-accounts (seed-overtime-accounts / seed-payroll-accounts
 *    extras)
 *
 * This is destructive — run only on environments that are about to be
 * repopulated manually or via the application. The down() migration is
 * a no-op (we cannot restore the wiped seed data).
 */
export class TrimSeedDataToAdminAndTestingServices20260715000003
  implements MigrationInterface
{
  name = 'TrimSeedDataToAdminAndTestingServices20260715000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Disable FK checks for the duration of this migration so we can
    // truncate in any order without having to thread dependency order
    // through every step.
    await queryRunner.query(`SET CONSTRAINTS ALL DEFERRED`);

    // ─── 1. Drop dependent join rows first ──────────────────────────────
    // user_roles: keep only the admin's link
    await queryRunner.query(`
      DELETE FROM user_roles
      WHERE user_id NOT IN (
        SELECT id FROM users WHERE email = 'admin@example.com'
      )
    `);
    // role_permissions for non-admin roles
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id NOT IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    `);

    // ─── 2. Non-admin users (test customer etc.) ────────────────────────
    await queryRunner.query(`
      DELETE FROM users
      WHERE email <> 'admin@example.com'
    `);

    // ─── 3. Customers (except the ones needed by the admin/testing seed) ─
    // The admin seed does not create customers. The test-customer seed
    // created a customer with user_id, which we already removed above.
    // We keep `customers` rows that the admin would need; in practice
    // there are none from the keep set, so we wipe all of them.
    await queryRunner.query(`
      DELETE FROM customers
      WHERE id NOT IN (
        SELECT customer_id FROM lab_contracts WHERE customer_id IS NOT NULL
        UNION
        SELECT customer_id FROM testing_requests WHERE customer_id IS NOT NULL
      )
    `);
    // Same for suppliers — keep only those referenced by lab POs / contracts.
    await queryRunner.query(`
      DELETE FROM suppliers
      WHERE id NOT IN (
        SELECT supplier_id FROM lab_purchase_orders WHERE supplier_id IS NOT NULL
        UNION
        SELECT supplier_id FROM purchase_orders WHERE supplier_id IS NOT NULL
      )
    `);

    // ─── 4. Departments, positions, assets, KPI thresholds ──────────────
    await queryRunner.query(`DELETE FROM assets`);
    await queryRunner.query(`DELETE FROM positions`);
    await queryRunner.query(`DELETE FROM departments`);
    await queryRunner.query(`DELETE FROM kpi_thresholds`);

    // ─── 5. Bank accounts, warehouses ───────────────────────────────────
    await queryRunner.query(`DELETE FROM bank_accounts`);
    await queryRunner.query(`DELETE FROM warehouses`);

    // ─── 6. Roles other than admin ───────────────────────────────────────
    await queryRunner.query(`
      DELETE FROM roles
      WHERE name <> 'admin'
    `);

    // ─── 7. Permissions not used by the admin role ──────────────────────
    // We first capture the admin role's permission set, then delete
    // every permission that is not in that set. We also keep
    // permissions that the testing-services migration relied on
    // (none — testing services have no permission mapping).
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE id NOT IN (
        SELECT permission_id FROM role_permissions
      )
    `);

    // ─── 8. Overtime / payroll / extra accounts ─────────────────────────
    // The admin seed does not insert accounts. Wipe any account rows
    // that exist (these came from seed-module-data, seed-payroll-accounts,
    // and seed-overtime-accounts).
    await queryRunner.query(`
      DELETE FROM accounts
      WHERE code IN (
        '5101', '5102', '5103', '5104', '5105', '5106',
        '2101', '2102', '2103',
        '1101', '1102',
        '4101', '4102', '4103', '4104', '4105', '4106', '4107', '4108', '4109', '4110', '4111',
        '5200', '5201',
        'OVT-BASIC', 'OVT-WEEKEND', 'OVT-HOLIDAY'
      )
    `);

    await queryRunner.query(`SET CONSTRAINTS ALL IMMEDIATE`);
  }

  public async down(): Promise<void> {
    // No-op: the trimmed seed data cannot be re-derived here.
  }
}