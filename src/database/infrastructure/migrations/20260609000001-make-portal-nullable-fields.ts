import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePortalNullableFields17260609000001 implements MigrationInterface {
  name = 'MakePortalNullableFields17260609000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "samples" ALTER COLUMN "sample_type_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "samples" ALTER COLUMN "sample_type_name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "testing_schedules" ALTER COLUMN "laboratory_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "testing_schedules" ALTER COLUMN "laboratory_name" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "samples" SET "sample_type_id" = '00000000-0000-0000-0000-000000000000' WHERE "sample_type_id" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "samples" SET "sample_type_name" = 'unknown' WHERE "sample_type_name" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "samples" ALTER COLUMN "sample_type_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "samples" ALTER COLUMN "sample_type_name" SET NOT NULL`,
    );

    await queryRunner.query(
      `UPDATE "testing_schedules" SET "laboratory_id" = '00000000-0000-0000-0000-000000000000' WHERE "laboratory_id" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "testing_schedules" SET "laboratory_name" = 'unknown' WHERE "laboratory_name" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "testing_schedules" ALTER COLUMN "laboratory_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "testing_schedules" ALTER COLUMN "laboratory_name" SET NOT NULL`,
    );
  }
}
