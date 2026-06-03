import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedModuleData20250523000001 implements MigrationInterface {
  name = 'SeedModuleData20250523000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== PERMISSIONS ====================

    const permissions = [
      // Finance
      { name: 'finance:read', resource: 'finance', action: 'read' },
      { name: 'finance:write', resource: 'finance', action: 'write' },
      { name: 'finance:delete', resource: 'finance', action: 'delete' },
      { name: 'invoices:read', resource: 'invoices', action: 'read' },
      { name: 'invoices:write', resource: 'invoices', action: 'write' },
      { name: 'invoices:delete', resource: 'invoices', action: 'delete' },
      { name: 'tax:read', resource: 'tax', action: 'read' },
      { name: 'tax:write', resource: 'tax', action: 'write' },
      { name: 'reports:read', resource: 'reports', action: 'read' },
      { name: 'reports:write', resource: 'reports', action: 'write' },
      // HR
      { name: 'hr:read', resource: 'hr', action: 'read' },
      { name: 'hr:write', resource: 'hr', action: 'write' },
      { name: 'hr:delete', resource: 'hr', action: 'delete' },
      { name: 'employees:read', resource: 'employees', action: 'read' },
      { name: 'employees:write', resource: 'employees', action: 'write' },
      { name: 'attendance:read', resource: 'attendance', action: 'read' },
      { name: 'attendance:write', resource: 'attendance', action: 'write' },
      { name: 'payroll:read', resource: 'payroll', action: 'read' },
      { name: 'payroll:write', resource: 'payroll', action: 'write' },
      // Warehouse
      { name: 'warehouse:read', resource: 'warehouse', action: 'read' },
      { name: 'warehouse:write', resource: 'warehouse', action: 'write' },
      { name: 'warehouse:delete', resource: 'warehouse', action: 'delete' },
      { name: 'inventory:read', resource: 'inventory', action: 'read' },
      { name: 'inventory:write', resource: 'inventory', action: 'write' },
      { name: 'equipment:read', resource: 'equipment', action: 'read' },
      { name: 'equipment:write', resource: 'equipment', action: 'write' },
      // Dashboard
      { name: 'dashboard:read', resource: 'dashboard', action: 'read' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (id, name, resource, action, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, now(), now())
         ON CONFLICT (name) DO NOTHING`,
        [p.name, p.resource, p.action],
      );
    }

    // ==================== ROLES ====================

    const roles = [
      {
        name: 'director',
        description:
          'Company Director with full read access and approval authority',
      },
      {
        name: 'finance_manager',
        description: 'Finance Manager with full finance module access',
      },
      {
        name: 'hr_manager',
        description: 'HR Manager with full HR & payroll access',
      },
      {
        name: 'warehouse_manager',
        description: 'Warehouse Manager with full inventory access',
      },
      {
        name: 'site_manager',
        description: 'Site Manager with limited operational access',
      },
      {
        name: 'accountant',
        description: 'Accountant with finance read/write access',
      },
      { name: 'hr_staff', description: 'HR Staff with limited HR access' },
    ];

    for (const r of roles) {
      await queryRunner.query(
        `INSERT INTO roles (id, name, description, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, now(), now())
         ON CONFLICT (name) DO NOTHING`,
        [r.name, r.description],
      );
    }

    // ==================== ROLE-PERMISSION MAPPINGS ====================

    const rolePermissions: Record<string, string[]> = {
      director: permissions.map((p) => p.name), // Director gets ALL permissions
      finance_manager: [
        'finance:read',
        'finance:write',
        'finance:delete',
        'invoices:read',
        'invoices:write',
        'invoices:delete',
        'tax:read',
        'tax:write',
        'reports:read',
        'reports:write',
        'dashboard:read',
      ],
      hr_manager: [
        'hr:read',
        'hr:write',
        'hr:delete',
        'employees:read',
        'employees:write',
        'attendance:read',
        'attendance:write',
        'payroll:read',
        'payroll:write',
        'reports:read',
        'dashboard:read',
      ],
      warehouse_manager: [
        'warehouse:read',
        'warehouse:write',
        'warehouse:delete',
        'inventory:read',
        'inventory:write',
        'equipment:read',
        'equipment:write',
        'dashboard:read',
      ],
      site_manager: [
        'warehouse:read',
        'inventory:read',
        'equipment:read',
        'hr:read',
        'employees:read',
        'attendance:read',
        'reports:read',
        'dashboard:read',
      ],
      accountant: [
        'finance:read',
        'finance:write',
        'invoices:read',
        'invoices:write',
        'tax:read',
        'tax:write',
        'reports:read',
        'dashboard:read',
      ],
      hr_staff: [
        'hr:read',
        'employees:read',
        'employees:write',
        'attendance:read',
        'attendance:write',
        'dashboard:read',
      ],
    };

    // Also give admin role all new permissions
    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'admin' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [p.name],
      );
    }

    for (const [roleName, permNames] of Object.entries(rolePermissions)) {
      for (const permName of permNames) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id FROM roles r, permissions p
           WHERE r.name = $1 AND p.name = $2
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [roleName, permName],
        );
      }
    }

    // ==================== SAMPLE USERS ====================

    // Password: password123 (bcrypt hash)
    const passwordHash =
      '$2b$12$WIZvM.m4FSdRAodeJ4v5QeY49xKhMZD0Sp0ifrrvrp3YG6x17b7de';

    const users = [
      {
        email: 'director@cakra.com',
        firstName: 'Budi',
        lastName: 'Santoso',
        role: 'director',
      },
      {
        email: 'finance@cakra.com',
        firstName: 'Siti',
        lastName: 'Rahayu',
        role: 'finance_manager',
      },
      {
        email: 'hr@cakra.com',
        firstName: 'Ahmad',
        lastName: 'Hidayat',
        role: 'hr_manager',
      },
      {
        email: 'warehouse@cakra.com',
        firstName: 'Dedi',
        lastName: 'Kurniawan',
        role: 'warehouse_manager',
      },
      {
        email: 'site@cakra.com',
        firstName: 'Eko',
        lastName: 'Prasetyo',
        role: 'site_manager',
      },
    ];

    for (const u of users) {
      // Insert user
      await queryRunner.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', now(), now())
         ON CONFLICT (email) DO NOTHING`,
        [u.email, passwordHash, u.firstName, u.lastName],
      );
      // Link user to role
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT u.id, r.id FROM users u, roles r
         WHERE u.email = $1 AND r.name = $2
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [u.email, u.role],
      );
    }

    // ==================== CHART OF ACCOUNTS (Indonesian SAK) ====================

    const accounts = [
      // Assets (1xxx)
      { code: '1000', name: 'Aset', type: 'asset', parent: null },
      { code: '1100', name: 'Kas & Bank', type: 'asset', parent: '1000' },
      { code: '1101', name: 'Kas Kecil', type: 'asset', parent: '1100' },
      { code: '1102', name: 'Bank BCA', type: 'asset', parent: '1100' },
      { code: '1103', name: 'Bank Mandiri', type: 'asset', parent: '1100' },
      { code: '1104', name: 'Bank BNI', type: 'asset', parent: '1100' },
      { code: '1200', name: 'Piutang Usaha', type: 'asset', parent: '1000' },
      { code: '1201', name: 'Piutang Dagang', type: 'asset', parent: '1200' },
      {
        code: '1202',
        name: 'Cadangan Kerugian Piutang',
        type: 'asset',
        parent: '1200',
      },
      { code: '1300', name: 'Persediaan', type: 'asset', parent: '1000' },
      {
        code: '1301',
        name: 'Persediaan Bahan Baku',
        type: 'asset',
        parent: '1300',
      },
      {
        code: '1302',
        name: 'Persediaan Suku Cadang',
        type: 'asset',
        parent: '1300',
      },
      {
        code: '1400',
        name: 'Biaya Dibayar Dimuka',
        type: 'asset',
        parent: '1000',
      },
      { code: '1500', name: 'Aset Tetap', type: 'asset', parent: '1000' },
      { code: '1501', name: 'Tanah', type: 'asset', parent: '1500' },
      { code: '1502', name: 'Bangunan', type: 'asset', parent: '1500' },
      { code: '1503', name: 'Kendaraan', type: 'asset', parent: '1500' },
      { code: '1504', name: 'Alat Berat', type: 'asset', parent: '1500' },
      { code: '1505', name: 'Peralatan Kantor', type: 'asset', parent: '1500' },
      {
        code: '1509',
        name: 'Akumulasi Penyusutan',
        type: 'asset',
        parent: '1500',
      },

      // Liabilities (2xxx)
      { code: '2000', name: 'Kewajiban', type: 'liability', parent: null },
      { code: '2100', name: 'Hutang Usaha', type: 'liability', parent: '2000' },
      {
        code: '2101',
        name: 'Hutang Dagang',
        type: 'liability',
        parent: '2100',
      },
      { code: '2200', name: 'Hutang Pajak', type: 'liability', parent: '2000' },
      {
        code: '2201',
        name: 'Hutang PPN',
        type: 'liability',
        parent: '2200',
        taxCategory: 'ppn',
      },
      {
        code: '2202',
        name: 'Hutang PPh 21',
        type: 'liability',
        parent: '2200',
        taxCategory: 'pph21',
      },
      {
        code: '2203',
        name: 'Hutang PPh 23',
        type: 'liability',
        parent: '2200',
        taxCategory: 'pph23',
      },
      { code: '2300', name: 'Hutang BPJS', type: 'liability', parent: '2000' },
      {
        code: '2301',
        name: 'Hutang BPJS Kesehatan',
        type: 'liability',
        parent: '2300',
      },
      {
        code: '2302',
        name: 'Hutang BPJS Ketenagakerjaan',
        type: 'liability',
        parent: '2300',
      },
      {
        code: '2400',
        name: 'Hutang Jangka Panjang',
        type: 'liability',
        parent: '2000',
      },
      { code: '2401', name: 'Hutang Bank', type: 'liability', parent: '2400' },

      // Equity (3xxx)
      { code: '3000', name: 'Ekuitas', type: 'equity', parent: null },
      { code: '3100', name: 'Modal Disetor', type: 'equity', parent: '3000' },
      { code: '3200', name: 'Laba Ditahan', type: 'equity', parent: '3000' },
      {
        code: '3300',
        name: 'Laba Tahun Berjalan',
        type: 'equity',
        parent: '3000',
      },

      // Revenue (4xxx)
      { code: '4000', name: 'Pendapatan', type: 'revenue', parent: null },
      {
        code: '4100',
        name: 'Pendapatan Jasa Pertambangan',
        type: 'revenue',
        parent: '4000',
      },
      {
        code: '4200',
        name: 'Pendapatan Jasa Konstruksi',
        type: 'revenue',
        parent: '4000',
      },
      {
        code: '4300',
        name: 'Pendapatan Jasa Laboratorium',
        type: 'revenue',
        parent: '4000',
      },
      {
        code: '4900',
        name: 'Pendapatan Lain-lain',
        type: 'revenue',
        parent: '4000',
      },

      // COGS (5xxx)
      {
        code: '5000',
        name: 'Harga Pokok Penjualan',
        type: 'expense',
        parent: null,
      },
      {
        code: '5100',
        name: 'Biaya Bahan Langsung',
        type: 'expense',
        parent: '5000',
      },
      {
        code: '5200',
        name: 'Biaya Tenaga Kerja Langsung',
        type: 'expense',
        parent: '5000',
      },
      {
        code: '5300',
        name: 'Biaya Overhead Proyek',
        type: 'expense',
        parent: '5000',
      },
      {
        code: '5301',
        name: 'Biaya Sewa Alat Berat',
        type: 'expense',
        parent: '5300',
      },
      {
        code: '5302',
        name: 'Biaya BBM & Pelumas',
        type: 'expense',
        parent: '5300',
      },
      {
        code: '5303',
        name: 'Biaya Pemeliharaan Alat',
        type: 'expense',
        parent: '5300',
      },

      // Operating Expenses (6xxx)
      {
        code: '6000',
        name: 'Biaya Operasional',
        type: 'expense',
        parent: null,
      },
      {
        code: '6100',
        name: 'Biaya Gaji & Tunjangan',
        type: 'expense',
        parent: '6000',
      },
      { code: '6101', name: 'Gaji Karyawan', type: 'expense', parent: '6100' },
      {
        code: '6102',
        name: 'Tunjangan Makan',
        type: 'expense',
        parent: '6100',
      },
      {
        code: '6103',
        name: 'Tunjangan Transport',
        type: 'expense',
        parent: '6100',
      },
      {
        code: '6104',
        name: 'BPJS Perusahaan',
        type: 'expense',
        parent: '6100',
      },
      { code: '6105', name: 'THR & Bonus', type: 'expense', parent: '6100' },
      { code: '6200', name: 'Biaya Kantor', type: 'expense', parent: '6000' },
      {
        code: '6201',
        name: 'Biaya Listrik & Air',
        type: 'expense',
        parent: '6200',
      },
      {
        code: '6202',
        name: 'Biaya Telepon & Internet',
        type: 'expense',
        parent: '6200',
      },
      { code: '6203', name: 'Biaya ATK', type: 'expense', parent: '6200' },
      {
        code: '6300',
        name: 'Biaya Penyusutan',
        type: 'expense',
        parent: '6000',
      },
      {
        code: '6400',
        name: 'Biaya Perjalanan Dinas',
        type: 'expense',
        parent: '6000',
      },
      { code: '6500', name: 'Biaya Asuransi', type: 'expense', parent: '6000' },
      {
        code: '6900',
        name: 'Biaya Lain-lain',
        type: 'expense',
        parent: '6000',
      },
    ];

    // Insert accounts - first pass (no parent_id)
    for (const acc of accounts) {
      await queryRunner.query(
        `INSERT INTO accounts (id, code, name, type, tax_category, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, now(), now())
         ON CONFLICT (code) DO NOTHING`,
        [
          acc.code,
          acc.name,
          acc.type,
          'taxCategory' in acc ? acc.taxCategory : null,
        ],
      );
    }

    // Second pass - set parent_id
    for (const acc of accounts) {
      if (acc.parent) {
        await queryRunner.query(
          `UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = $1)
           WHERE code = $2 AND parent_id IS NULL`,
          [acc.parent, acc.code],
        );
      }
    }

    // ==================== KPI THRESHOLDS (defaults) ====================

    await queryRunner.query(`
      INSERT INTO kpi_thresholds (id, alert_type, value, is_active, created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'min_cash_balance', 500000000, true, now(), now()),
        (gen_random_uuid(), 'max_overdue_receivables', 2000000000, true, now(), now()),
        (gen_random_uuid(), 'project_cost_overrun', 15, true, now(), now())
      ON CONFLICT (alert_type) DO NOTHING
    `);

    // ==================== SAMPLE WAREHOUSES ====================

    await queryRunner.query(`
      INSERT INTO warehouses (id, name, location, type, is_active, created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'Gudang Utama Jakarta', 'Jakarta', 'main', true, now(), now()),
        (gen_random_uuid(), 'Gudang Site Kalimantan', 'Kalimantan Timur', 'site', true, now(), now()),
        (gen_random_uuid(), 'Gudang Site Sulawesi', 'Sulawesi Selatan', 'site', true, now(), now())
      ON CONFLICT DO NOTHING
    `);

    // ==================== SAMPLE BANK ACCOUNTS ====================

    await queryRunner.query(`
      INSERT INTO bank_accounts (id, bank_name, account_number, account_name, current_balance, is_active, created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'Bank BCA', '1234567890', 'PT Cakram ERP', 1500000000, true, now(), now()),
        (gen_random_uuid(), 'Bank Mandiri', '0987654321', 'PT Cakram ERP', 800000000, true, now(), now()),
        (gen_random_uuid(), 'Bank BNI', '1122334455', 'PT Cakram ERP', 350000000, true, now(), now())
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove sample data
    await queryRunner.query(
      `DELETE FROM bank_accounts WHERE account_name = 'PT Cakram ERP'`,
    );
    await queryRunner.query(`DELETE FROM warehouses WHERE name LIKE 'Gudang%'`);
    await queryRunner.query(`DELETE FROM kpi_thresholds`);

    // Remove accounts
    await queryRunner.query(`UPDATE accounts SET parent_id = NULL`);
    await queryRunner.query(`DELETE FROM accounts`);

    // Remove sample users
    const userEmails = [
      'director@cakra.com',
      'finance@cakra.com',
      'hr@cakra.com',
      'warehouse@cakra.com',
      'site@cakra.com',
    ];
    for (const email of userEmails) {
      await queryRunner.query(
        `DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
        [email],
      );
      await queryRunner.query(`DELETE FROM users WHERE email = $1`, [email]);
    }

    // Remove role-permission mappings for new roles
    const roleNames = [
      'director',
      'finance_manager',
      'hr_manager',
      'warehouse_manager',
      'site_manager',
      'accountant',
      'hr_staff',
    ];
    for (const name of roleNames) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = $1)`,
        [name],
      );
      await queryRunner.query(`DELETE FROM roles WHERE name = $1`, [name]);
    }

    // Remove new permissions (also remove from admin role)
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name IN ('finance:read','finance:write','finance:delete','invoices:read','invoices:write','invoices:delete','tax:read','tax:write','reports:read','reports:write','hr:read','hr:write','hr:delete','employees:read','employees:write','attendance:read','attendance:write','payroll:read','payroll:write','warehouse:read','warehouse:write','warehouse:delete','inventory:read','inventory:write','equipment:read','equipment:write','dashboard:read'))`,
    );
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN ('finance:read','finance:write','finance:delete','invoices:read','invoices:write','invoices:delete','tax:read','tax:write','reports:read','reports:write','hr:read','hr:write','hr:delete','employees:read','employees:write','attendance:read','attendance:write','payroll:read','payroll:write','warehouse:read','warehouse:write','warehouse:delete','inventory:read','inventory:write','equipment:read','equipment:write','dashboard:read')`,
    );
  }
}
