import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1746832777569 implements MigrationInterface {
  name = 'Migration1746832777569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "storage" ADD "config" jsonb`);
    await queryRunner.query(
      `COMMENT ON COLUMN "storage"."config" IS 'Provider-specific configurations, e.g., { folderId: ''abc'' }'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `COMMENT ON COLUMN "storage"."config" IS 'Provider-specific configurations, e.g., { folderId: ''abc'' }'`
    );
    await queryRunner.query(`ALTER TABLE "storage" DROP COLUMN "config"`);
  }
}
