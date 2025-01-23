import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1737654147744 implements MigrationInterface {
  name = 'Migration1737654147744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "storage" ADD "last_updated" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "storage" DROP COLUMN "last_updated"`);
  }
}
