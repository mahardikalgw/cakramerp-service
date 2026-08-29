import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMissingTestingParameters20260809000001 implements MigrationInterface {
  name = 'SeedMissingTestingParameters20260809000001';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // For any active testing_service that has zero testing_parameters,
    // insert a generic parameter so the Additional Parameters dropdown is not empty.
    // This fixes schedules like 627be675... whose service had no seeded params.
    await queryRunner.query(`
      INSERT INTO testing_parameters (id, testing_service_id, name, standard, unit, is_active, created_at, updated_at)
      SELECT gen_random_uuid(), ts.id, 'Hasil Uji', ts.sni, '-', true, NOW(), NOW()
      FROM testing_services ts
      WHERE ts.is_active = true
        AND ts.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM testing_parameters tp
          WHERE tp.testing_service_id = ts.id AND tp.deleted_at IS NULL
        )
      ON CONFLICT DO NOTHING
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM testing_parameters WHERE name = 'Hasil Uji' AND standard IS NOT NULL`,
    );
  }
}
