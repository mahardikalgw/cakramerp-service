import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedPayrollAccounts20250530000001 implements MigrationInterface {
  name = 'SeedPayrollAccounts20250530000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure salary expense account exists
    await queryRunner.query(`
      INSERT INTO accounts (code, name, type, is_active)
      VALUES ('5101', 'Biaya Gaji Karyawan', 'expense', true)
      ON CONFLICT (code) DO NOTHING;
    `)

    // Ensure PPh 21 payable account exists
    await queryRunner.query(`
      INSERT INTO accounts (code, name, type, is_active)
      VALUES ('2310', 'Hutang PPh 21', 'liability', true)
      ON CONFLICT (code) DO NOTHING;
    `)

    // Ensure BPJS employer expense account exists
    await queryRunner.query(`
      INSERT INTO accounts (code, name, type, is_active)
      VALUES ('5102', 'Biaya BPJS Perusahaan', 'expense', true)
      ON CONFLICT (code) DO NOTHING;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM accounts WHERE code IN ('5101', '2310', '5102');`)
  }
}
