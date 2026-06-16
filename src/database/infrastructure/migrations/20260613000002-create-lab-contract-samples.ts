import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLabContractSamples20260613000002 implements MigrationInterface {
  name = 'CreateLabContractSamples20260613000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_contract_samples (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id UUID NOT NULL REFERENCES lab_contracts(id) ON DELETE CASCADE,
        sample_id UUID NOT NULL REFERENCES samples(id),
        testing_service_id UUID REFERENCES testing_services(id),
        service_name VARCHAR(255) NOT NULL,
        sample_code VARCHAR(100),
        sample_description TEXT,
        sample_quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
        total_price DECIMAL(18,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lab_contract_samples_contract ON lab_contract_samples(contract_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_contract_samples_sample ON lab_contract_samples(sample_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lab_contract_samples`);
  }
}