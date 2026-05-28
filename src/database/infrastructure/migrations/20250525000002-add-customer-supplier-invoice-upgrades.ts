import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCustomerSupplierAndInvoiceUpgrades20250525000002
  implements MigrationInterface
{
  name = 'AddCustomerSupplierAndInvoiceUpgrades20250525000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create customers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "email" varchar(255),
        "phone" varchar(50),
        "address" text,
        "city" varchar(100),
        "contact_person" varchar(255),
        "tax_id" varchar(100),
        "notes" text,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `)

    // Create suppliers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "email" varchar(255),
        "phone" varchar(50),
        "address" text,
        "city" varchar(100),
        "contact_person" varchar(255),
        "tax_id" varchar(100),
        "bank_account" varchar(100),
        "bank_name" varchar(100),
        "notes" text,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id")
      )
    `)

    // Add customer_id, payment_term_days, payment_term_label, additional_discount to ar_invoices
    await queryRunner.query(`ALTER TABLE "ar_invoices" ADD COLUMN IF NOT EXISTS "customer_id" uuid`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" ADD COLUMN IF NOT EXISTS "payment_term_days" integer`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" ADD COLUMN IF NOT EXISTS "payment_term_label" varchar(255)`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" ADD COLUMN IF NOT EXISTS "additional_discount" decimal(18,2) DEFAULT 0`)

    // Add supplier_id, payment_term_days, payment_term_label, additional_discount to ap_invoices
    await queryRunner.query(`ALTER TABLE "ap_invoices" ADD COLUMN IF NOT EXISTS "supplier_id" uuid`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" ADD COLUMN IF NOT EXISTS "payment_term_days" integer`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" ADD COLUMN IF NOT EXISTS "payment_term_label" varchar(255)`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" ADD COLUMN IF NOT EXISTS "additional_discount" decimal(18,2) DEFAULT 0`)

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "ar_invoices"
      ADD CONSTRAINT "FK_ar_invoices_customer"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "ap_invoices"
      ADD CONSTRAINT "FK_ap_invoices_supplier"
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL
    `)

    // Seed customer and supplier permissions
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "name", "resource", "action", "created_at", "updated_at")
      VALUES
        (gen_random_uuid(), 'customers:read', 'customers', 'read', now(), now()),
        (gen_random_uuid(), 'customers:create', 'customers', 'create', now(), now()),
        (gen_random_uuid(), 'customers:update', 'customers', 'update', now(), now()),
        (gen_random_uuid(), 'customers:delete', 'customers', 'delete', now(), now()),
        (gen_random_uuid(), 'suppliers:read', 'suppliers', 'read', now(), now()),
        (gen_random_uuid(), 'suppliers:create', 'suppliers', 'create', now(), now()),
        (gen_random_uuid(), 'suppliers:update', 'suppliers', 'update', now(), now()),
        (gen_random_uuid(), 'suppliers:delete', 'suppliers', 'delete', now(), now())
      ON CONFLICT (name) DO NOTHING
    `)

    // Assign new permissions to admin role
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'admin'
        AND p.name IN (
          'customers:read', 'customers:create', 'customers:update', 'customers:delete',
          'suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete'
        )
      ON CONFLICT DO NOTHING
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove FK constraints
    await queryRunner.query(`ALTER TABLE "ar_invoices" DROP CONSTRAINT IF EXISTS "FK_ar_invoices_customer"`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" DROP CONSTRAINT IF EXISTS "FK_ap_invoices_supplier"`)

    // Remove columns from ar_invoices
    await queryRunner.query(`ALTER TABLE "ar_invoices" DROP COLUMN IF EXISTS "customer_id"`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" DROP COLUMN IF EXISTS "payment_term_days"`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" DROP COLUMN IF EXISTS "payment_term_label"`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" DROP COLUMN IF EXISTS "additional_discount"`)

    // Remove columns from ap_invoices
    await queryRunner.query(`ALTER TABLE "ap_invoices" DROP COLUMN IF EXISTS "supplier_id"`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" DROP COLUMN IF EXISTS "payment_term_days"`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" DROP COLUMN IF EXISTS "payment_term_label"`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" DROP COLUMN IF EXISTS "additional_discount"`)

    // Remove permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE name IN (
          'customers:read', 'customers:create', 'customers:update', 'customers:delete',
          'suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete'
        )
      )
    `)
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE name IN (
        'customers:read', 'customers:create', 'customers:update', 'customers:delete',
        'suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete'
      )
    `)

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`)
  }
}
