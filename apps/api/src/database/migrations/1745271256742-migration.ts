import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1745271256742 implements MigrationInterface {
  name = 'Migration1745271256742';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "uploads" ADD "file_name" character varying`);
    await queryRunner.query(
      `ALTER TYPE "public"."uploads_type_enum" RENAME TO "uploads_type_enum_old"`
    );
    await queryRunner.query(`CREATE TYPE "public"."uploads_type_enum" AS ENUM('file', 'magnet')`);
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "uploads" ALTER COLUMN "type" TYPE "public"."uploads_type_enum" USING "type"::"text"::"public"."uploads_type_enum"`
    );
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "type" SET DEFAULT 'file'`);
    await queryRunner.query(`DROP TYPE "public"."uploads_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."uploads_type_enum_old" AS ENUM('regular', 'magnet')`
    );
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "uploads" ALTER COLUMN "type" TYPE "public"."uploads_type_enum_old" USING "type"::"text"::"public"."uploads_type_enum_old"`
    );
    await queryRunner.query(`ALTER TABLE "uploads" ALTER COLUMN "type" SET DEFAULT 'regular'`);
    await queryRunner.query(`DROP TYPE "public"."uploads_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."uploads_type_enum_old" RENAME TO "uploads_type_enum"`
    );
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "file_name"`);
  }
}
