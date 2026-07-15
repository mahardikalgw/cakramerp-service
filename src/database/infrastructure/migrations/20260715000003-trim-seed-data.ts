import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Trim the database down to the bare minimum seed data.
 *
 * Keep:
 *  - Admin user (admin@example.com) seeded by 20250519000002-seed-admin-data
 *  - Testing services seeded by 20260611000002-seed-testing-services
 *
 * Wipe:
 *  - All other users (including the test customer user)
 *  - All non-admin customer / supplier records
 *  - All department / position / asset / KPI threshold rows
 *  - All bank_accounts / warehouses
 *  - All non-admin roles + their role_permissions / user_roles
 *  - All non-admin permissions (keep only those used by the admin role)
 *  - All overtime / payroll / extra accounts
 *
 * This is destructive — run only on environments that are about to be
 * repopulated manually or via the application. down() is a no-op.
 *
 * Safety: every DELETE that references an external column is wrapped
 * in an information_schema column-existence check so the migration
 * does not break on environments where the column has not been added
 * yet (the original failure: "column supplier_id does not exist").
 */
export class TrimSeedDataToAdminAndTestingServices20260715000003
  implements MigrationInterface
{
  name = 'TrimSeedDataToAdminAndTestingServices20260715000003';

  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = $1
         AND column_name = $2
       LIMIT 1`,
      [tableName, columnName],
    )) as unknown[];
    return rows.length > 0;
  }

  private async deleteIfColumnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    deleteSql: string,
  ): Promise<void> {
    if (await this.columnExists(queryRunner, tableName, columnName)) {
      await queryRunner.query(deleteSql);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop dependent join rows
    await queryRunner.query(`
      DELETE FROM user_roles
      WHERE user_id NOT IN (
        SELECT id FROM users WHERE email = 'admin@example.com'
      )
    `);
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id NOT IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    `);

    // 2. Non-admin users
    await queryRunner.query(`
      DELETE FROM users
      WHERE email <> 'admin@example.com'
    `);

    // 3. Customers (only if reference columns exist)
    await this.deleteIfColumnExists(
      queryRunner,
      'lab_contracts',
      'customer_id',
      `DELETE FROM customers
       WHERE id NOT IN (
         SELECT customer_id FROM lab_contracts WHERE customer_id IS NOT NULL
       )`,
    );
    await this.deleteIfColumnExists(
      queryRunner,
      'testing_requests',
      'customer_id',
      `DELETE FROM customers
       WHERE id NOT IN (
         SELECT customer_id FROM testing_requests WHERE customer_id IS NOT NULL
       )`,
    );

    // 4. Suppliers (only if reference columns exist)
    await this.deleteIfColumnExists(
      queryRunner,
      'lab_purchase_orders',
      'supplier_id',
      `DELETE FROM suppliers
       WHERE id NOT IN (
         SELECT supplier_id FROM lab_purchase_orders WHERE supplier_id IS NOT NULL
       )`,
    );
    await this.deleteIfColumnExists(
      queryRunner,
      'purchase_orders',
      'supplier_id',
      `DELETE FROM suppliers
       WHERE id NOT IN (
         SELECT supplier_id FROM purchase_orders WHERE supplier_id IS NOT NULL
       )`,
    );

    // 5. Best-effort simple deletes (skip if table missing)
    for (const table of [
      'assets',
      'positions',
      'departments',
      'kpi_thresholds',
      'bank_accounts',
      'warehouses',
    ]) {
      try {
        await queryRunner.query(`DELETE FROM ${table}`);
      } catch (err: any) {
        if (err?.code !== '42P01') throw err;
      }
    }

    // 6. Roles other than admin
    await queryRunner.query(`DELETE FROM roles WHERE name <> 'admin'`);

    // 7. Permissions not in use by the admin role
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE id NOT IN (SELECT permission_id FROM role_permissions)
    `);

    // 8. Overtime / payroll / extra accounts
    await queryRunner.query(`
      DELETE FROM accounts
      WHERE code IN (
        '5101','5102','5103','5104','5105','5106',
        '2101','2102','2103',
        '1101','1102',
        '4101','4102','4103','4104','4105','4106','4107','4108','4109','4110','4111',
        '5200','5201',
        'OVT-BASIC','OVT-WEEKEND','OVT-HOLIDAY'
      )
    `);
  }

  public async down(): Promise<void> {
    // No-op.
  }
}
