import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1737491560585 implements MigrationInterface {
  name = 'Migration1737491560585';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."storage_provider_enum" AS ENUM('GOOGLE_DRIVE')`);
    await queryRunner.query(
      `CREATE TABLE "storage" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "provider" "public"."storage_provider_enum" NOT NULL, "access_token" text NOT NULL, "refresh_token" text, "expiry_date" bigint, CONSTRAINT "PK_f9b67a9921474d86492aad2e027" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_STORAGE_USER_PROVIDER" ON "storage" ("user_id", "provider") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_STORAGE_USER_PROVIDER"`);
    await queryRunner.query(`DROP TABLE "storage"`);
    await queryRunner.query(`DROP TYPE "public"."storage_provider_enum"`);
  }
}
