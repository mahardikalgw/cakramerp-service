import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAssets20250527000008 implements MigrationInterface {
  name = 'SeedAssets20250527000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO assets (asset_number, name, description, category, acquisition_date, acquisition_cost, salvage_value, useful_life_months, depreciation_method, declining_balance_rate, total_estimated_units, units_produced_to_date, current_book_value, accumulated_depreciation, depreciation_schedule, status, location)
      VALUES
        ('AST-2024-0001', 'Laptop Dell XPS 15', 'Dell XPS 15 9530 for engineering team', 'IT Equipment', '2024-01-15', 25000000, 3000000, 48, 'straight_line', NULL, NULL, 0, 25000000, 0, 'monthly', 'active', 'Office Floor 2'),
        ('AST-2024-0002', 'Toyota Avanza 2024', 'Company vehicle for operations', 'Vehicle', '2024-03-01', 250000000, 50000000, 96, 'declining_balance', 0.25, NULL, 0, 250000000, 0, 'monthly', 'active', 'Parking Lot A'),
        ('AST-2024-0003', 'CNC Milling Machine', 'Haas VF-2 CNC vertical milling machine', 'Machinery', '2024-02-10', 800000000, 80000000, 120, 'unit_production', NULL, 500000, 0, 800000000, 0, 'monthly', 'active', 'Workshop A'),
        ('AST-2024-0004', 'Office Furniture Set', 'Desks and chairs for 20 workstations', 'Furniture', '2024-01-05', 60000000, 5000000, 60, 'straight_line', NULL, NULL, 0, 60000000, 0, 'quarterly', 'active', 'Office Floor 1'),
        ('AST-2024-0005', 'Server Rack HP ProLiant', 'HP ProLiant DL380 Gen10 server', 'IT Equipment', '2024-04-20', 150000000, 15000000, 60, 'declining_balance', 0.4, NULL, 0, 150000000, 0, 'monthly', 'active', 'Server Room'),
        ('AST-2025-0001', 'Forklift Toyota 8FD25', 'Toyota 8FD25 diesel forklift', 'Heavy Equipment', '2025-01-10', 350000000, 50000000, 96, 'unit_production', NULL, 20000, 0, 350000000, 0, 'monthly', 'active', 'Warehouse'),
        ('AST-2025-0002', 'Air Conditioning System', 'Daikin VRV central AC for office', 'Building Equipment', '2025-02-15', 120000000, 10000000, 120, 'straight_line', NULL, NULL, 0, 120000000, 0, 'yearly', 'active', 'Office Building'),
        ('AST-2025-0003', 'Printer Epson L15150', 'Epson EcoTank L15150 A3 printer', 'IT Equipment', '2025-03-01', 12000000, 1000000, 48, 'straight_line', NULL, NULL, 0, 12000000, 0, 'monthly', 'active', 'Office Floor 1'),
        ('AST-2025-0004', 'Genset Cummins 100kVA', 'Backup power generator', 'Building Equipment', '2025-01-20', 200000000, 20000000, 120, 'declining_balance', 0.2, NULL, 0, 200000000, 0, 'quarterly', 'active', 'Utility Room'),
        ('AST-2025-0005', 'Conveyor Belt System', 'Automated conveyor for production line', 'Machinery', '2025-04-01', 450000000, 45000000, 96, 'unit_production', NULL, 1000000, 0, 450000000, 0, 'monthly', 'active', 'Production Line 1')
      ON CONFLICT (asset_number) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM assets WHERE asset_number IN (
        'AST-2024-0001', 'AST-2024-0002', 'AST-2024-0003', 'AST-2024-0004', 'AST-2024-0005',
        'AST-2025-0001', 'AST-2025-0002', 'AST-2025-0003', 'AST-2025-0004', 'AST-2025-0005'
      );
    `);
  }
}
