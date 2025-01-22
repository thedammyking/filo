import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStorageCleanupTrigger implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function to remove expired tokens
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION remove_expired_storage_tokens()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        DELETE FROM storage
        WHERE refresh_token_expires_at < NOW();
        RETURN NULL;
      END;
      $$;
    `);

    // Create trigger that runs every hour
    await queryRunner.query(`
      CREATE OR REPLACE TRIGGER cleanup_expired_storage_tokens
      AFTER INSERT OR UPDATE ON storage
      EXECUTE FUNCTION remove_expired_storage_tokens();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS cleanup_expired_storage_tokens ON storage;');
    await queryRunner.query('DROP FUNCTION IF EXISTS remove_expired_storage_tokens();');
  }
}
