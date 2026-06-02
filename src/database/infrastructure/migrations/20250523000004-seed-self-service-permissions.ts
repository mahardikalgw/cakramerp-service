import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSelfServicePermissions20250523000004 implements MigrationInterface {
  name = 'SeedSelfServicePermissions20250523000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== SELF-SERVICE PERMISSIONS ====================

    const permissions = [
      // Profile
      {
        name: 'self-service-profile:read',
        resource: 'self-service-profile',
        action: 'read',
      },
      {
        name: 'self-service-profile:write',
        resource: 'self-service-profile',
        action: 'write',
      },
      // Attendance
      {
        name: 'self-service-attendance:read',
        resource: 'self-service-attendance',
        action: 'read',
      },
      {
        name: 'self-service-attendance:write',
        resource: 'self-service-attendance',
        action: 'write',
      },
      // Leave
      {
        name: 'self-service-leave:read',
        resource: 'self-service-leave',
        action: 'read',
      },
      {
        name: 'self-service-leave:write',
        resource: 'self-service-leave',
        action: 'write',
      },
      // Payslip
      {
        name: 'self-service-payslip:read',
        resource: 'self-service-payslip',
        action: 'read',
      },
      // Schedule
      {
        name: 'self-service-schedule:read',
        resource: 'self-service-schedule',
        action: 'read',
      },
      // Overtime
      {
        name: 'self-service-overtime:read',
        resource: 'self-service-overtime',
        action: 'read',
      },
      {
        name: 'self-service-overtime:write',
        resource: 'self-service-overtime',
        action: 'write',
      },
      // Overtime approval (admin/supervisor)
      { name: 'overtime:approve', resource: 'overtime', action: 'approve' },
      // Leave approval (admin/supervisor)
      { name: 'leave:approve', resource: 'leave', action: 'approve' },
      // Administration
      { name: 'audit:read', resource: 'audit', action: 'read' },
      { name: 'audit:write', resource: 'audit', action: 'write' },
      { name: 'backups:read', resource: 'backups', action: 'read' },
      { name: 'backups:write', resource: 'backups', action: 'write' },
      { name: 'settings:read', resource: 'settings', action: 'read' },
      { name: 'settings:write', resource: 'settings', action: 'write' },
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
        name: 'employee',
        description: 'Regular employee with self-service access',
      },
      {
        name: 'supervisor',
        description:
          'Supervisor with self-service access and approval authority',
      },
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

    const employeePermissions = [
      'self-service-profile:read',
      'self-service-profile:write',
      'self-service-attendance:read',
      'self-service-attendance:write',
      'self-service-leave:read',
      'self-service-leave:write',
      'self-service-payslip:read',
      'self-service-schedule:read',
      'self-service-overtime:read',
      'self-service-overtime:write',
    ];

    const supervisorPermissions = [
      ...employeePermissions,
      'overtime:approve',
      'leave:approve',
    ];

    const rolePermissions: Record<string, string[]> = {
      employee: employeePermissions,
      supervisor: supervisorPermissions,
    };

    // Give admin role all self-service permissions
    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'admin' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [p.name],
      );
    }

    // Give hr_manager role all self-service permissions (manages employee requests)
    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'hr_manager' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [p.name],
      );
    }

    // Map permissions to employee and supervisor roles
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

    // ==================== SAMPLE EMPLOYEES ====================

    const employees = [
      {
        employeeNumber: 'EMP-001',
        fullName: 'Budi Santoso',
        email: 'director@cakra.com',
        phone: '081234567001',
        employmentType: 'permanent',
        positionName: 'Director',
        departmentName: 'Management',
        siteName: 'Head Office Jakarta',
        joinDate: '2020-01-15',
        basicSalary: 50000000,
        bankName: 'Bank BCA',
        bankAccountNumber: '1234500001',
        npwp: '12.345.678.9-001.000',
        role: 'supervisor',
      },
      {
        employeeNumber: 'EMP-002',
        fullName: 'Siti Rahayu',
        email: 'finance@cakra.com',
        phone: '081234567002',
        employmentType: 'permanent',
        positionName: 'Finance Manager',
        departmentName: 'Finance',
        siteName: 'Head Office Jakarta',
        joinDate: '2020-03-01',
        basicSalary: 35000000,
        bankName: 'Bank Mandiri',
        bankAccountNumber: '1234500002',
        npwp: '12.345.678.9-002.000',
        role: 'supervisor',
      },
      {
        employeeNumber: 'EMP-003',
        fullName: 'Ahmad Hidayat',
        email: 'hr@cakra.com',
        phone: '081234567003',
        employmentType: 'permanent',
        positionName: 'HR Manager',
        departmentName: 'Human Resources',
        siteName: 'Head Office Jakarta',
        joinDate: '2020-02-10',
        basicSalary: 35000000,
        bankName: 'Bank BCA',
        bankAccountNumber: '1234500003',
        npwp: '12.345.678.9-003.000',
        role: 'supervisor',
      },
      {
        employeeNumber: 'EMP-004',
        fullName: 'Dedi Kurniawan',
        email: 'warehouse@cakra.com',
        phone: '081234567004',
        employmentType: 'permanent',
        positionName: 'Warehouse Manager',
        departmentName: 'Warehouse',
        siteName: 'Gudang Site Kalimantan',
        joinDate: '2021-01-05',
        basicSalary: 30000000,
        bankName: 'Bank BNI',
        bankAccountNumber: '1234500004',
        npwp: '12.345.678.9-004.000',
        role: 'supervisor',
      },
      {
        employeeNumber: 'EMP-005',
        fullName: 'Eko Prasetyo',
        email: 'site@cakra.com',
        phone: '081234567005',
        employmentType: 'permanent',
        positionName: 'Site Manager',
        departmentName: 'Operations',
        siteName: 'Gudang Site Kalimantan',
        joinDate: '2021-06-15',
        basicSalary: 28000000,
        bankName: 'Bank Mandiri',
        bankAccountNumber: '1234500005',
        npwp: '12.345.678.9-005.000',
        role: 'supervisor',
      },
      {
        employeeNumber: 'EMP-006',
        fullName: 'Rina Wulandari',
        email: 'rina.wulandari@cakra.com',
        phone: '081234567006',
        employmentType: 'permanent',
        positionName: 'Accountant',
        departmentName: 'Finance',
        siteName: 'Head Office Jakarta',
        joinDate: '2022-01-10',
        basicSalary: 15000000,
        bankName: 'Bank BCA',
        bankAccountNumber: '1234500006',
        npwp: '12.345.678.9-006.000',
        role: 'employee',
      },
      {
        employeeNumber: 'EMP-007',
        fullName: 'Agus Setiawan',
        email: 'agus.setiawan@cakra.com',
        phone: '081234567007',
        employmentType: 'permanent',
        positionName: 'HR Staff',
        departmentName: 'Human Resources',
        siteName: 'Head Office Jakarta',
        joinDate: '2022-03-20',
        basicSalary: 12000000,
        bankName: 'Bank Mandiri',
        bankAccountNumber: '1234500007',
        npwp: '12.345.678.9-007.000',
        role: 'employee',
      },
      {
        employeeNumber: 'EMP-008',
        fullName: 'Dewi Lestari',
        email: 'dewi.lestari@cakra.com',
        phone: '081234567008',
        employmentType: 'permanent',
        positionName: 'Warehouse Staff',
        departmentName: 'Warehouse',
        siteName: 'Gudang Site Kalimantan',
        joinDate: '2022-05-01',
        basicSalary: 10000000,
        bankName: 'Bank BNI',
        bankAccountNumber: '1234500008',
        npwp: '12.345.678.9-008.000',
        role: 'employee',
      },
      {
        employeeNumber: 'EMP-009',
        fullName: 'Hendra Gunawan',
        email: 'hendra.gunawan@cakra.com',
        phone: '081234567009',
        employmentType: 'contract',
        positionName: 'Heavy Equipment Operator',
        departmentName: 'Operations',
        siteName: 'Gudang Site Sulawesi',
        joinDate: '2023-01-15',
        basicSalary: 9000000,
        bankName: 'Bank BCA',
        bankAccountNumber: '1234500009',
        npwp: '12.345.678.9-009.000',
        role: 'employee',
      },
      {
        employeeNumber: 'EMP-010',
        fullName: 'Putri Amelia',
        email: 'putri.amelia@cakra.com',
        phone: '081234567010',
        employmentType: 'permanent',
        positionName: 'Admin Staff',
        departmentName: 'Management',
        siteName: 'Head Office Jakarta',
        joinDate: '2023-04-01',
        basicSalary: 8000000,
        bankName: 'Bank Mandiri',
        bankAccountNumber: '1234500010',
        npwp: '12.345.678.9-010.000',
        role: 'employee',
      },
    ];

    // Password: password123 (bcrypt hash)
    const passwordHash =
      '$2b$12$WIZvM.m4FSdRAodeJ4v5QeY49xKhMZD0Sp0ifrrvrp3YG6x17b7de';

    for (const emp of employees) {
      // Insert employee record
      await queryRunner.query(
        `INSERT INTO employees (id, employee_number, full_name, email, phone, employment_type, position_name, department_name, site_name, join_date, basic_salary, bank_name, bank_account_number, npwp, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', now(), now())
         ON CONFLICT (employee_number) DO NOTHING`,
        [
          emp.employeeNumber,
          emp.fullName,
          emp.email,
          emp.phone,
          emp.employmentType,
          emp.positionName,
          emp.departmentName,
          emp.siteName,
          emp.joinDate,
          emp.basicSalary,
          emp.bankName,
          emp.bankAccountNumber,
          emp.npwp,
        ],
      );

      // Create user account for new employees (EMP-006 to EMP-010)
      // EMP-001 to EMP-005 already have user accounts from previous seeder
      const isNewUser = parseInt(emp.employeeNumber.replace('EMP-', '')) > 5;

      if (isNewUser) {
        const [firstName, ...lastParts] = emp.fullName.split(' ');
        const lastName = lastParts.join(' ');

        await queryRunner.query(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', now(), now())
           ON CONFLICT (email) DO NOTHING`,
          [emp.email, passwordHash, firstName, lastName],
        );

        // Assign role to new user
        await queryRunner.query(
          `INSERT INTO user_roles (user_id, role_id)
           SELECT u.id, r.id FROM users u, roles r
           WHERE u.email = $1 AND r.name = $2
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [emp.email, emp.role],
        );
      }

      // Link user to employee record (set employee_id on users table)
      await queryRunner.query(
        `UPDATE users SET employee_id = (SELECT id FROM employees WHERE employee_number = $1)
         WHERE email = $2 AND employee_id IS NULL`,
        [emp.employeeNumber, emp.email],
      );
    }

    // Set supervisor_id for employees (managers supervise their department staff)
    const supervisorMappings = [
      // Rina (Finance) → supervised by Siti (Finance Manager)
      { employee: 'EMP-006', supervisor: 'EMP-002' },
      // Agus (HR) → supervised by Ahmad (HR Manager)
      { employee: 'EMP-007', supervisor: 'EMP-003' },
      // Dewi (Warehouse) → supervised by Dedi (Warehouse Manager)
      { employee: 'EMP-008', supervisor: 'EMP-004' },
      // Hendra (Operations) → supervised by Eko (Site Manager)
      { employee: 'EMP-009', supervisor: 'EMP-005' },
      // Putri (Admin) → supervised by Budi (Director)
      { employee: 'EMP-010', supervisor: 'EMP-001' },
    ];

    for (const mapping of supervisorMappings) {
      await queryRunner.query(
        `UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_number = $1)
         WHERE employee_number = $2`,
        [mapping.supervisor, mapping.employee],
      );
    }

    // ==================== LEAVE BALANCES (for current year) ====================

    const currentYear = new Date().getFullYear();

    for (const emp of employees) {
      // Annual leave balance
      await queryRunner.query(
        `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, remaining_days, created_at, updated_at)
         SELECT gen_random_uuid(), e.id, lt.id, $3, lt.default_days_per_year, 0, lt.default_days_per_year, now(), now()
         FROM employees e, leave_types lt
         WHERE e.employee_number = $1 AND lt.code = $2
         ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
        [emp.employeeNumber, 'annual', currentYear],
      );

      // Sick leave balance
      await queryRunner.query(
        `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, remaining_days, created_at, updated_at)
         SELECT gen_random_uuid(), e.id, lt.id, $3, lt.default_days_per_year, 0, lt.default_days_per_year, now(), now()
         FROM employees e, leave_types lt
         WHERE e.employee_number = $1 AND lt.code = $2
         ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
        [emp.employeeNumber, 'sick', currentYear],
      );
    }

    // Also give existing manager users the employee/supervisor role
    const managerEmails = [
      'director@cakra.com',
      'finance@cakra.com',
      'hr@cakra.com',
      'warehouse@cakra.com',
      'site@cakra.com',
    ];
    for (const email of managerEmails) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT u.id, r.id FROM users u, roles r
         WHERE u.email = $1 AND r.name = 'supervisor'
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [email],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const permissionNames = [
      'self-service-profile:read',
      'self-service-profile:write',
      'self-service-attendance:read',
      'self-service-attendance:write',
      'self-service-leave:read',
      'self-service-leave:write',
      'self-service-payslip:read',
      'self-service-schedule:read',
      'self-service-overtime:read',
      'self-service-overtime:write',
      'overtime:approve',
      'leave:approve',
      'audit:read',
      'audit:write',
      'backups:read',
      'backups:write',
      'settings:read',
      'settings:write',
    ];

    // Remove leave balances for seeded employees
    const employeeNumbers = [
      'EMP-001',
      'EMP-002',
      'EMP-003',
      'EMP-004',
      'EMP-005',
      'EMP-006',
      'EMP-007',
      'EMP-008',
      'EMP-009',
      'EMP-010',
    ];
    for (const empNum of employeeNumbers) {
      await queryRunner.query(
        `DELETE FROM leave_balances WHERE employee_id = (SELECT id FROM employees WHERE employee_number = $1)`,
        [empNum],
      );
    }

    // Remove supervisor role from manager users
    const managerEmails = [
      'director@cakra.com',
      'finance@cakra.com',
      'hr@cakra.com',
      'warehouse@cakra.com',
      'site@cakra.com',
    ];
    for (const email of managerEmails) {
      await queryRunner.query(
        `DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = $1) AND role_id = (SELECT id FROM roles WHERE name = 'supervisor')`,
        [email],
      );
    }

    // Unlink users from employees
    await queryRunner.query(
      `UPDATE users SET employee_id = NULL WHERE employee_id IS NOT NULL`,
    );

    // Remove new staff user accounts and their roles (EMP-006 to EMP-010)
    const newUserEmails = [
      'rina.wulandari@cakra.com',
      'agus.setiawan@cakra.com',
      'dewi.lestari@cakra.com',
      'hendra.gunawan@cakra.com',
      'putri.amelia@cakra.com',
    ];
    for (const email of newUserEmails) {
      await queryRunner.query(
        `DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
        [email],
      );
      await queryRunner.query(`DELETE FROM users WHERE email = $1`, [email]);
    }

    // Remove employee records
    for (const empNum of employeeNumbers) {
      await queryRunner.query(
        `DELETE FROM employees WHERE employee_number = $1`,
        [empNum],
      );
    }

    // Remove role-permission mappings for employee and supervisor roles
    const roleNames = ['employee', 'supervisor'];
    for (const name of roleNames) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = $1)`,
        [name],
      );
      await queryRunner.query(`DELETE FROM roles WHERE name = $1`, [name]);
    }

    // Remove self-service permissions from admin and hr_manager roles
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name = ANY($1)
      )`,
      [permissionNames],
    );

    // Remove permissions
    await queryRunner.query(`DELETE FROM permissions WHERE name = ANY($1)`, [
      permissionNames,
    ]);
  }
}
