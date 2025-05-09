import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1746829623653 implements MigrationInterface {
  name = 'Migration1746829623653';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "metadata"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "errorMessage"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "size"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "storage_path"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "destination_path"`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "file_size" bigint`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "error" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "error"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "file_size"`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "destination_path" character varying`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "storage_path" character varying`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "size" bigint`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "errorMessage" text`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "metadata" jsonb`);
  }
}
