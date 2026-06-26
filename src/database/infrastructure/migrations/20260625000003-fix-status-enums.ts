import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStatusEnums1719384000000 implements MigrationInterface {
  name = 'FixStatusEnums1719384000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Fix testing_requests statuses ───────────────────────────────
    await queryRunner.query(`
      UPDATE testing_requests
      SET status = 'approved', updated_at = NOW()
      WHERE status = 'active_contract'
    `);

    // ── Fix lab_contracts statuses ──────────────────────────────────
    // awaiting_signature / draft / in_progress → active
    await queryRunner.query(`
      UPDATE lab_contracts
      SET status = 'active', updated_at = NOW()
      WHERE status IN ('awaiting_signature', 'draft', 'in_progress')
    `);

    // cancelled → closed
    await queryRunner.query(`
      UPDATE lab_contracts
      SET status = 'closed', updated_at = NOW()
      WHERE status = 'cancelled'
    `);

    // ── Recalculate contract amounts from DP amount ─────────────────
    // totalAmount = downPaymentAmount (DP already includes PPN)
    // taxAmount   = DP × 11 / 111
    // baseAmount  = DP − tax
    await queryRunner.query(`
      UPDATE lab_contracts lc
      SET
        total_amount  = tr.down_payment_amount,
        tax_amount    = ROUND(tr.down_payment_amount * 11.0 / 111, 2),
        base_amount   = tr.down_payment_amount - ROUND(tr.down_payment_amount * 11.0 / 111, 2),
        tax_percent   = 11,
        updated_at    = NOW()
      FROM testing_requests tr
      WHERE lc.testing_request_id = tr.id
        AND tr.down_payment_amount IS NOT NULL
        AND tr.down_payment_amount > 0
        AND lc.total_amount != tr.down_payment_amount
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No safe reverse — old statuses no longer exist in domain.
  }
}
