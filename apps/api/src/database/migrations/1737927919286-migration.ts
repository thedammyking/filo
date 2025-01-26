import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1737927919286 implements MigrationInterface {
  name = 'Migration1737927919286';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."uploads_type_enum" AS ENUM('regular', 'magnet')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."uploads_status_enum" AS ENUM('pending', 'success', 'failed')`
    );
    await queryRunner.query(
      `CREATE TABLE "uploads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "link" character varying NOT NULL, "type" "public"."uploads_type_enum" NOT NULL DEFAULT 'regular', "status" "public"."uploads_status_enum" NOT NULL DEFAULT 'pending', "progress" double precision NOT NULL DEFAULT '0', "user_id" character varying NOT NULL, "completed_at" TIMESTAMP, "storageId" uuid, CONSTRAINT "PK_d1781d1eedd7459314f60f39bd3" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_UPLOADS_USER_ID" ON "uploads" ("user_id") `);
    await queryRunner.query(`DROP INDEX "public"."IDX_STORAGE_USER_PROVIDER"`);
    await queryRunner.query(
      `ALTER TYPE "public"."storage_provider_enum" RENAME TO "storage_provider_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."storage_provider_enum" AS ENUM('GOOGLE_DRIVE', 'DROPBOX', 'ONE_DRIVE')`
    );
    await queryRunner.query(
      `ALTER TABLE "storage" ALTER COLUMN "provider" TYPE "public"."storage_provider_enum" USING "provider"::"text"::"public"."storage_provider_enum"`
    );
    await queryRunner.query(`DROP TYPE "public"."storage_provider_enum_old"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_STORAGE_USER_PROVIDER" ON "storage" ("user_id", "provider") `
    );
    await queryRunner.query(
      `ALTER TABLE "uploads" ADD CONSTRAINT "FK_8e86cd8cd69be6b453829d7db28" FOREIGN KEY ("storageId") REFERENCES "storage"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "uploads" DROP CONSTRAINT "FK_8e86cd8cd69be6b453829d7db28"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_STORAGE_USER_PROVIDER"`);
    await queryRunner.query(
      `CREATE TYPE "public"."storage_provider_enum_old" AS ENUM('GOOGLE_DRIVE')`
    );
    await queryRunner.query(
      `ALTER TABLE "storage" ALTER COLUMN "provider" TYPE "public"."storage_provider_enum_old" USING "provider"::"text"::"public"."storage_provider_enum_old"`
    );
    await queryRunner.query(`DROP TYPE "public"."storage_provider_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."storage_provider_enum_old" RENAME TO "storage_provider_enum"`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_STORAGE_USER_PROVIDER" ON "storage" ("provider", "user_id") `
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_UPLOADS_USER_ID"`);
    await queryRunner.query(`DROP TABLE "uploads"`);
    await queryRunner.query(`DROP TYPE "public"."uploads_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."uploads_type_enum"`);
  }
}
