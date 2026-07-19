import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSniToTestingServices20260718000003
  implements MigrationInterface
{
  name = 'AddSniToTestingServices20260718000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_services
      ADD COLUMN IF NOT EXISTS sni VARCHAR(100) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_services
      DROP COLUMN IF EXISTS sni
    `);
  }
}