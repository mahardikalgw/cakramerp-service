import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenSampleCodeColumn20260618100001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        ALTER COLUMN sample_code TYPE text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        ALTER COLUMN sample_code TYPE varchar(100)
    `);
  }
}
