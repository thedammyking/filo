import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1745346583410 implements MigrationInterface {
  name = 'Migration1745346583410';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."uploads_status_enum" RENAME TO "uploads_status_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."uploads_status_enum" AS ENUM('pending', 'processing', 'success', 'failed')`
    );
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "uploads" ALTER COLUMN "status" TYPE "public"."uploads_status_enum" USING "status"::"text"::"public"."uploads_status_enum"`
    );
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`DROP TYPE "public"."uploads_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."uploads_status_enum_old" AS ENUM('pending', 'success', 'failed')`
    );
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "uploads" ALTER COLUMN "status" TYPE "public"."uploads_status_enum_old" USING "status"::"text"::"public"."uploads_status_enum_old"`
    );
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`DROP TYPE "public"."uploads_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."uploads_status_enum_old" RENAME TO "uploads_status_enum"`
    );
  }
}
