import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTestingParameters20260720000001
  implements MigrationInterface
{
  name = 'CreateTestingParameters20260720000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE testing_parameters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        testing_service_id UUID NOT NULL REFERENCES testing_services(id),
        name VARCHAR(255) NOT NULL,
        standard VARCHAR(100),
        unit VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      );

      CREATE INDEX idx_testing_parameters_service ON testing_parameters(testing_service_id);
      CREATE INDEX idx_testing_parameters_name ON testing_parameters(name);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS testing_parameters');
  }
}
