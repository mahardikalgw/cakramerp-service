import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeWorkTime20250527000006 implements MigrationInterface {
  name = 'AddEmployeeWorkTime20250527000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_start_time VARCHAR(5) DEFAULT '08:00';
    `);
    await queryRunner.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_end_time VARCHAR(5) DEFAULT '17:00';
    `);
    await queryRunner.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 60;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS work_start_time;`,
    );
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS work_end_time;`,
    );
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS break_duration_minutes;`,
    );
  }
}
