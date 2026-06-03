import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchasingAndSales20250602000001 implements MigrationInterface {
  name = 'CreatePurchasingAndSales20250602000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── PURCHASING TABLES ─────────────────────────────────────────────

    // Purchase Requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pr_number VARCHAR(50) NOT NULL UNIQUE,
        requested_by VARCHAR(255) NOT NULL,
        department_id UUID,
        department_name VARCHAR(255),
        request_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        notes TEXT,
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_request_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
        item_id UUID,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity NUMERIC(18,4) NOT NULL,
        uom VARCHAR(50),
        unit_cost NUMERIC(18,2) DEFAULT 0,
        line_type VARCHAR(20) NOT NULL DEFAULT 'goods',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Purchase Orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id UUID NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        purchase_request_id UUID REFERENCES purchase_requests(id),
        order_date DATE NOT NULL,
        expected_delivery_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        payment_term_days INTEGER DEFAULT 30,
        payment_term_label VARCHAR(100),
        notes TEXT,
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        gl_posting_queue_id UUID,
        journal_entry_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        purchase_request_line_id UUID REFERENCES purchase_request_lines(id),
        item_id UUID,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity NUMERIC(18,4) NOT NULL,
        received_quantity NUMERIC(18,4) DEFAULT 0,
        uom VARCHAR(50),
        unit_cost NUMERIC(18,2) NOT NULL,
        total_cost NUMERIC(18,2) NOT NULL,
        line_type VARCHAR(20) NOT NULL DEFAULT 'goods',
        fulfillment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Purchase Returns
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number VARCHAR(50) NOT NULL UNIQUE,
        purchase_order_id UUID REFERENCES purchase_orders(id),
        supplier_id UUID NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        return_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        reason TEXT,
        gl_posting_queue_id UUID,
        journal_entry_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_return_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
        item_id UUID,
        item_name VARCHAR(255) NOT NULL,
        quantity NUMERIC(18,4) NOT NULL,
        uom VARCHAR(50),
        unit_cost NUMERIC(18,2) NOT NULL,
        total_cost NUMERIC(18,2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── SALES TABLES ─────────────────────────────────────────────────

    // Quotations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        quotation_date DATE NOT NULL,
        valid_until DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(18,2) DEFAULT 0,
        tax_amount NUMERIC(18,2) DEFAULT 0,
        grand_total NUMERIC(18,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quotation_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
        item_id UUID,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity NUMERIC(18,4) NOT NULL,
        uom VARCHAR(50),
        unit_price NUMERIC(18,2) NOT NULL,
        tax_percent NUMERIC(5,2) DEFAULT 0,
        amount NUMERIC(18,2) NOT NULL,
        line_type VARCHAR(20) NOT NULL DEFAULT 'goods',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sales Orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        so_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        quotation_id UUID REFERENCES quotations(id),
        order_date DATE NOT NULL,
        expected_delivery_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(18,2) DEFAULT 0,
        tax_amount NUMERIC(18,2) DEFAULT 0,
        grand_total NUMERIC(18,2) NOT NULL DEFAULT 0,
        payment_term_days INTEGER DEFAULT 30,
        payment_term_label VARCHAR(100),
        notes TEXT,
        gl_posting_queue_id UUID,
        journal_entry_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        quotation_line_id UUID REFERENCES quotation_lines(id),
        item_id UUID,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity NUMERIC(18,4) NOT NULL,
        delivered_quantity NUMERIC(18,4) DEFAULT 0,
        uom VARCHAR(50),
        unit_price NUMERIC(18,2) NOT NULL,
        tax_percent NUMERIC(5,2) DEFAULT 0,
        amount NUMERIC(18,2) NOT NULL,
        line_type VARCHAR(20) NOT NULL DEFAULT 'goods',
        fulfillment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sales Returns
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number VARCHAR(50) NOT NULL UNIQUE,
        sales_order_id UUID REFERENCES sales_orders(id),
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        return_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        reason TEXT,
        gl_posting_queue_id UUID,
        journal_entry_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_return_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sales_return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        item_id UUID,
        item_name VARCHAR(255) NOT NULL,
        quantity NUMERIC(18,4) NOT NULL,
        uom VARCHAR(50),
        unit_price NUMERIC(18,2) NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── INDEXES ───────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requests(status);
      CREATE INDEX IF NOT EXISTS idx_pr_department ON purchase_requests(department_id);
      CREATE INDEX IF NOT EXISTS idx_prl_pr ON purchase_request_lines(purchase_request_id);
      CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_po_pr ON purchase_orders(purchase_request_id);
      CREATE INDEX IF NOT EXISTS idx_pol_po ON purchase_order_lines(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_prtn_supplier ON purchase_returns(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_prtn_status ON purchase_returns(status);
      CREATE INDEX IF NOT EXISTS idx_prtnl_return ON purchase_return_lines(purchase_return_id);
      CREATE INDEX IF NOT EXISTS idx_quot_customer ON quotations(customer_id);
      CREATE INDEX IF NOT EXISTS idx_quot_status ON quotations(status);
      CREATE INDEX IF NOT EXISTS idx_quotl_quot ON quotation_lines(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_so_customer ON sales_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status);
      CREATE INDEX IF NOT EXISTS idx_so_quot ON sales_orders(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_sol_so ON sales_order_lines(sales_order_id);
      CREATE INDEX IF NOT EXISTS idx_srtn_customer ON sales_returns(customer_id);
      CREATE INDEX IF NOT EXISTS idx_srtn_status ON sales_returns(status);
      CREATE INDEX IF NOT EXISTS idx_srtnl_return ON sales_return_lines(sales_return_id);
    `);

    // ─── PERMISSIONS ──────────────────────────────────────────────────

    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action) VALUES
        ('purchase-requests:read', 'purchase-requests', 'read'),
        ('purchase-requests:create', 'purchase-requests', 'create'),
        ('purchase-requests:update', 'purchase-requests', 'update'),
        ('purchase-requests:delete', 'purchase-requests', 'delete'),
        ('purchase-requests:approve', 'purchase-requests', 'approve'),
        ('purchase-orders:read', 'purchase-orders', 'read'),
        ('purchase-orders:create', 'purchase-orders', 'create'),
        ('purchase-orders:update', 'purchase-orders', 'update'),
        ('purchase-orders:delete', 'purchase-orders', 'delete'),
        ('purchase-orders:approve', 'purchase-orders', 'approve'),
        ('purchase-returns:read', 'purchase-returns', 'read'),
        ('purchase-returns:create', 'purchase-returns', 'create'),
        ('purchase-returns:update', 'purchase-returns', 'update'),
        ('purchase-returns:delete', 'purchase-returns', 'delete'),
        ('quotations:read', 'quotations', 'read'),
        ('quotations:create', 'quotations', 'create'),
        ('quotations:update', 'quotations', 'update'),
        ('quotations:delete', 'quotations', 'delete'),
        ('sales-orders:read', 'sales-orders', 'read'),
        ('sales-orders:create', 'sales-orders', 'create'),
        ('sales-orders:update', 'sales-orders', 'update'),
        ('sales-orders:delete', 'sales-orders', 'delete'),
        ('sales-orders:approve', 'sales-orders', 'approve'),
        ('sales-returns:read', 'sales-returns', 'read'),
        ('sales-returns:create', 'sales-returns', 'create'),
        ('sales-returns:update', 'sales-returns', 'update'),
        ('sales-returns:delete', 'sales-returns', 'delete')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign to roles
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'purchase-requests:read','purchase-requests:create','purchase-requests:update','purchase-requests:delete','purchase-requests:approve',
          'purchase-orders:read','purchase-orders:create','purchase-orders:update','purchase-orders:delete','purchase-orders:approve',
          'purchase-returns:read','purchase-returns:create','purchase-returns:update','purchase-returns:delete',
          'quotations:read','quotations:create','quotations:update','quotations:delete',
          'sales-orders:read','sales-orders:create','sales-orders:update','sales-orders:delete','sales-orders:approve',
          'sales-returns:read','sales-returns:create','sales-returns:update','sales-returns:delete'
        )
      ON CONFLICT DO NOTHING;
    `);

    // Assign purchasing permissions to finance_manager
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'finance_manager'
        AND p.name IN (
          'purchase-requests:read','purchase-requests:create','purchase-requests:update',
          'purchase-orders:read','purchase-orders:create','purchase-orders:update','purchase-orders:approve',
          'purchase-returns:read','purchase-returns:create',
          'quotations:read','quotations:create','quotations:update',
          'sales-orders:read','sales-orders:create','sales-orders:update','sales-orders:approve',
          'sales-returns:read','sales-returns:create'
        )
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sales_return_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_returns;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_order_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_orders;`);
    await queryRunner.query(`DROP TABLE IF EXISTS quotation_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS quotations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_return_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_returns;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_order_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_orders;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_request_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_requests;`);
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource IN (
          'purchase-requests','purchase-orders','purchase-returns',
          'quotations','sales-orders','sales-returns'
        )
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE resource IN (
        'purchase-requests','purchase-orders','purchase-returns',
        'quotations','sales-orders','sales-returns'
      );
    `);
  }
}
