import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSupplierIdToGoodsReceipts1748164800000
  implements MigrationInterface
{
  name = 'AddSupplierIdToGoodsReceipts1748164800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "supplier_id" uuid`,
    )

    await queryRunner.query(`
      ALTER TABLE "goods_receipts"
      ADD CONSTRAINT "FK_goods_receipts_supplier"
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "goods_receipts" DROP CONSTRAINT IF EXISTS "FK_goods_receipts_supplier"`,
    )
    await queryRunner.query(
      `ALTER TABLE "goods_receipts" DROP COLUMN IF EXISTS "supplier_id"`,
    )
  }
}
