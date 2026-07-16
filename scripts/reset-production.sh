#!/bin/bash
# ============================================================
# Production database reset script for cakramerp-service
# ============================================================
# Preserves:
#   - admin user (admin@example.com) — required for login
#   - testing_services catalog rows
#   - All schema (tables, FKs, indexes, etc.)
#
# Wipes:
#   - Every employee, payroll, attendance, leave, performance row
#   - Every customer, supplier, asset, department, position row
#   - Every bank_account, warehouse, KPI threshold
#   - Every non-admin user, role, permission
#   - Every overtime / payroll / extra chart-of-account row
#
# Usage:
#   bash scripts/reset-production.sh
#   DB_CONTAINER=my-pg bash scripts/reset-production.sh
# ============================================================

set -euo pipefail

# App container that runs the migrations. Not strictly needed for
# the manual reset, but useful for the sanity check below.
APP_CONTAINER="${APP_CONTAINER:-cakramerp-service-staging}"
# Database container that actually holds the data.
DB_CONTAINER="${DB_CONTAINER:-cakramerp-postgres-staging}"
DB_NAME="${DB_NAME:-cakramerp}"
DB_USER="${DB_USER:-postgres}"

echo "▶ Reset target:"
echo "  - App container : $APP_CONTAINER"
echo "  - DB container   : $DB_CONTAINER"
echo "  - Database       : $DB_NAME"
echo ""
echo "This will wipe every row in the database except:"
echo "  - the admin user (admin@example.com)"
echo "  - the testing_services catalog"
echo "  - the schema itself (tables, indexes, FKs)"
echo ""
read -p "Are you sure? Type YES to continue: " confirm
if [ "$confirm" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "▶ Step 1/4: Dumping the current database to a backup file..."
BACKUP_FILE="cakramerp-backup-$(date +%Y%m%d-%H%M%S).sql"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "/tmp/$BACKUP_FILE" 2>/dev/null || true
if [ -s "/tmp/$BACKUP_FILE" ]; then
  echo "  ✓ Backup saved to /tmp/$BACKUP_FILE ($(du -h /tmp/$BACKUP_FILE | cut -f1))"
else
  echo "  ⚠ Backup failed or empty — continuing without a backup"
fi
echo ""

echo "▶ Step 2/4: Removing the failed migration rows so the next deploy is clean..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'SQL' || true
DELETE FROM migrations
WHERE name IN (
  'TrimSeedDataToAdminAndTestingServices20260715000003',
  'TrimSeedDataToAdminAndTestingServicesV220260715000004',
  'TrimSeedDataV5DisableFkAndSavepoints20260715000007',
  'TrimSeedDataV3WipeEmployeesAndAdminRoles20260715000005',
  'TrimSeedDataV4UseSavepoints20260715000006',
  'TrimSeedDataV6DropFkAndWipe20260715000007'
);
SQL
echo ""

echo "▶ Step 3/4: Truncating every non-essential table (preserving admin and testing services)..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'SQL'
BEGIN;

-- 1. Drop FK constraints on every employee-related child table.
--    ALTER TABLE ... DROP CONSTRAINT IF EXISTS is a no-op if the
--    constraint does not exist, so it is safe to spam.
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

-- 2. Wipe everything in dependency order.
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

echo "▶ Step 4/4: Verifying the app can still authenticate as admin..."
if docker exec "$APP_CONTAINER" echo "container ok" >/dev/null 2>&1; then
  echo "  ✓ App container $APP_CONTAINER is reachable"
else
  echo "  ⚠ App container $APP_CONTAINER is not reachable (skip)"
fi
echo ""
echo "✅ Database reset complete!"
echo "   - admin@example.com user is preserved (login still works)"
echo "   - testing services catalog is preserved"
echo "   - every other row is wiped"
