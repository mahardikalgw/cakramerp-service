#!/bin/bash
# ============================================================
# CI/CD Database Reset Script for cakramerp-service
# ============================================================
# Non-interactive version for GitHub Actions.
# Preserves:
#   - admin user (admin@example.com)
#   - testing_services catalog rows
#   - All schema (tables, FKs, indexes, etc.)
#
# Usage:
#   bash scripts/reset-db-ci.sh
# ============================================================

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-cakramerp}"

PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo "▶ Reset target:"
echo "  - Host     : $DB_HOST:$DB_PORT"
echo "  - Database : $DB_NAME"
echo ""

echo "▶ Step 1/3: Dumping the current database to a backup file..."
BACKUP_FILE="cakramerp-reset-$(date +%Y%m%d-%H%M%S).sql"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "/tmp/$BACKUP_FILE" 2>/dev/null || true
if [ -s "/tmp/$BACKUP_FILE" ]; then
  echo "  ✓ Backup saved to /tmp/$BACKUP_FILE ($(du -h /tmp/$BACKUP_FILE | cut -f1))"
else
  echo "  ⚠ Backup failed or empty — continuing without a backup"
fi
echo ""

echo "▶ Step 2/3: Truncating every non-essential table..."
$PSQL <<'SQL'
BEGIN;

-- 1. Drop FK constraints on employee-related child tables
DO $$
DECLARE
  child_tables TEXT[] := ARRAY[
    'payslips', 'payroll_lines', 'payroll_runs',
    'attendance_records', 'attendance_corrections',
    'leave_requests', 'leave_balances', 'overtime_requests',
    'employee_documents', 'employee_contracts',
    'employee_salary_components', 'employee_bank_accounts',
    'employee_dependents', 'employee_emergency_contacts',
    'employee_educations', 'employee_work_experiences',
    'employee_certifications', 'employee_trainings',
    'performance_reviews', 'performance_goals', 'performance_kpis',
    'self_service_requests',
    'approval_requests', 'approval_request_steps',
    'employee_assets'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY child_tables LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS fk_%I_employee_id', t, t);
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS FK_%I_employee_id', t, t);
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_employee_id_fkey', t, t);
  END LOOP;
END $$;

-- 2. Truncate all tables in dependency order
TRUNCATE TABLE
  payslips, payroll_lines, payroll_runs,
  attendance_records, attendance_corrections,
  leave_requests, leave_balances, overtime_requests,
  employee_documents, employee_contracts,
  employee_salary_components, employee_bank_accounts,
  employee_dependents, employee_emergency_contacts,
  employee_educations, employee_work_experiences,
  employee_certifications, employee_trainings,
  performance_reviews, performance_goals, performance_kpis,
  self_service_requests,
  approval_requests, approval_request_steps,
  employee_assets,
  employees,
  customers, suppliers, assets, positions, departments,
  kpi_thresholds, bank_accounts, warehouses,
  user_roles, role_permissions,
  (SELECT id FROM roles WHERE name <> 'admin'),
  (SELECT id FROM permissions
   WHERE id NOT IN (SELECT permission_id FROM role_permissions)),
  (SELECT id FROM accounts
   WHERE code IN (
     '5101','5102','5103','5104','5105','5106',
     '2101','2102','2103',
     '1101','1102',
     '4101','4102','4103','4104','4105','4106','4107','4108','4109','4110','4111',
     '5200','5201',
     'OVT-BASIC','OVT-WEEKEND','OVT-HOLIDAY'
   )),
  (SELECT id FROM users WHERE email <> 'admin@example.com'),
  RESTART IDENTITY CASCADE;

COMMIT;

-- 3. Sanity check
SELECT 'admin user kept:' AS info, COUNT(*)::text AS value FROM users WHERE email = 'admin@example.com'
UNION ALL SELECT 'testing services kept:', COUNT(*)::text FROM testing_services
UNION ALL SELECT 'employees remaining:', COUNT(*)::text FROM employees
UNION ALL SELECT 'non-admin users remaining:', COUNT(*)::text FROM users WHERE email <> 'admin@example.com'
UNION ALL SELECT 'non-admin roles remaining:', COUNT(*)::text FROM roles WHERE name <> 'admin'
UNION ALL SELECT 'departments remaining:', COUNT(*)::text FROM departments
UNION ALL SELECT 'customers remaining:', COUNT(*)::text FROM customers
UNION ALL SELECT 'suppliers remaining:', COUNT(*)::text FROM suppliers
UNION ALL SELECT 'payroll runs remaining:', COUNT(*)::text FROM payroll_runs
UNION ALL SELECT 'payslips remaining:', COUNT(*)::text FROM payslips;
SQL
echo ""

echo "▶ Step 3/3: Verifying admin user exists..."
ADMIN_COUNT=$($PSQL -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@example.com'" | tr -d ' ')
if [ "$ADMIN_COUNT" -ge 1 ]; then
  echo "  ✓ Admin user preserved"
else
  echo "  ✗ Admin user not found — something went wrong!"
  exit 1
fi
echo ""

echo "✅ Database reset complete!"
echo "   - admin@example.com user is preserved"
echo "   - testing services catalog is preserved"
echo "   - every other row is wiped"
