import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillZeroUnitPrice20260810000001 implements MigrationInterface {
  name = 'BackfillZeroUnitPrice20260810000001';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE testing_request_lines AS trl
      SET unit_price = ts.unit_price
      FROM testing_services ts
      WHERE trl.testing_service_id = ts.id
        AND trl.testing_request_id IN (
          SELECT id FROM testing_requests WHERE billing_type = 'cash'
        )
        AND (trl.unit_price IS NULL OR trl.unit_price = 0)
        AND ts.unit_price > 0
    `);
    await queryRunner.query(`
      UPDATE lab_purchase_order_lines AS lpol
      SET unit_price = ts.unit_price,
          total = ts.unit_price * lpol.quantity
      FROM testing_services ts
      WHERE lpol.testing_service_id = ts.id
        AND (lpol.unit_price IS NULL OR lpol.unit_price = 0)
        AND ts.unit_price > 0
    `);
    await queryRunner.query(`
      UPDATE lab_purchase_orders AS lpo
      SET total_amount = sub.sum
      FROM (SELECT lab_purchase_order_id AS id, SUM(total) AS sum FROM lab_purchase_order_lines GROUP BY lab_purchase_order_id) sub
      WHERE lpo.id = sub.id AND (lpo.total_amount = 0 OR lpo.total_amount IS NULL)
    `);
  }
  public async down(): Promise<void> {}
}
