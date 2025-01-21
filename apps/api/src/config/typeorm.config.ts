import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*-migration.ts'],
  synchronize: false,
  logging: true,
  migrationsRun: true
});
