import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkExistingUsersToEmployees20250527000005 implements MigrationInterface {
  name = 'LinkExistingUsersToEmployees20250527000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Link existing users to employees by matching email address
    await queryRunner.query(`
      UPDATE users u
      SET employee_id = e.id
      FROM employees e
      WHERE u.email = e.email
        AND u.employee_id IS NULL
        AND e.email IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users SET employee_id = NULL;
    `);
  }
}
