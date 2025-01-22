import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1737554728176 implements MigrationInterface {
  name = 'Migration1737554728176';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "storage" ADD "refresh_token_expires_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "storage" DROP COLUMN "refresh_token_expires_at"`);
  }
}
