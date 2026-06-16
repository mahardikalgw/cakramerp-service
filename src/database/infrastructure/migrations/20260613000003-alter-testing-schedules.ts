import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTestingSchedules20260613000003 implements MigrationInterface {
  name = 'AlterTestingSchedules20260613000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES lab_contracts(id) ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS created_by UUID`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS scheduled_date DATE`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS scheduled_location VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS qty_samples INT`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS laboran_id UUID`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS laboran_name VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS confirmed_by UUID`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS confirmed_by_name VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS status_notes TEXT`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_testing_schedules_contract ON testing_schedules(contract_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_testing_schedules_date ON testing_schedules(scheduled_date)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS contract_id`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS created_by`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS created_by_name`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS scheduled_date`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS scheduled_time`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS scheduled_location`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS qty_samples`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS laboran_id`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS laboran_name`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS confirmed_by`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS confirmed_by_name`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS confirmed_at`);
    await queryRunner.query(`ALTER TABLE testing_schedules DROP COLUMN IF EXISTS status_notes`);
  }
}