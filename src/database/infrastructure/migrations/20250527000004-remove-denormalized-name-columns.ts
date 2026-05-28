import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveDenormalizedNameColumns20250527000004 implements MigrationInterface {
  name = 'RemoveDenormalizedNameColumns20250527000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE employees DROP COLUMN IF EXISTS position_name;`)
    await queryRunner.query(`ALTER TABLE employees DROP COLUMN IF EXISTS department_name;`)
    await queryRunner.query(`ALTER TABLE employees DROP COLUMN IF EXISTS site_name;`)
    await queryRunner.query(`ALTER TABLE employees DROP COLUMN IF EXISTS site_id;`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS position_name VARCHAR(255);`)
    await queryRunner.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);`)
    await queryRunner.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS site_name VARCHAR(255);`)
    await queryRunner.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS site_id UUID;`)
  }
}
