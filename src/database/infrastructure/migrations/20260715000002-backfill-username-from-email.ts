import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill `users.username` from `users.email` (the local part before @)
 * for any user that does not yet have a username. This lets existing
 * users log in with their email handle as their username while keeping
 * the unique-index constraint.
 *
 * Examples:
 *   "admin@cakraerp.id"   -> username = "admin"
 *   "john.doe@acme.co.id" -> username = "john.doe"
 *
 * If a generated username would collide with an existing one (very
 * unlikely since it was NULL for all old rows), the row is left alone
 * — the user can set a username later via the user-edit UI.
 */
export class BackfillUsernameFromEmail20260715000002 implements MigrationInterface {
  name = 'BackfillUsernameFromEmail20260715000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Lowercase the local part of the email and use it as the username.
    await queryRunner.query(`
      UPDATE users
      SET username = LOWER(SPLIT_PART(email, '@', 1))
      WHERE username IS NULL
        AND email IS NOT NULL
        AND email <> ''
    `);

    // 2. If two users happen to share the same email-local (e.g. both
    //    "test@x.com" and "test@y.com"), keep only the first (lowest id)
    //    and clear the duplicates so the unique index is satisfied.
    await queryRunner.query(`
      UPDATE users u
      SET username = NULL
      WHERE u.username IS NOT NULL
        AND u.id NOT IN (
          SELECT MIN(id::text)::uuid
          FROM users
          WHERE username IS NOT NULL
          GROUP BY username
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: we don't want to wipe usernames that may have been edited
    // by the user after the backfill.
  }
}
