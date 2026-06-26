import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSamplePhotoUrl20260618200001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        ADD COLUMN sample_photo_url VARCHAR(500)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        DROP COLUMN sample_photo_url
    `);
  }
}
