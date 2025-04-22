import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1745361750899 implements MigrationInterface {
  name = 'Migration1745361750899';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "destination_path"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "storage_path"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "size"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "errorMessage"`);
    await queryRunner.query(`ALTER TABLE "uploads" DROP COLUMN "metadata"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "uploads" ADD "metadata" jsonb`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "errorMessage" text`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "size" bigint`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "storage_path" character varying`);
    await queryRunner.query(`ALTER TABLE "uploads" ADD "destination_path" character varying`);
  }
}
