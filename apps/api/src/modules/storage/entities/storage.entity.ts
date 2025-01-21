import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

import { generatePrefixedUUID } from '@/lib/utils';
import { StorageProvider } from '../constants/storage-provider.enum';
import { BaseEntity } from '@/commons/entities/base.entity';

@Entity('storage')
@Index('IDX_STORAGE_USER_PROVIDER', ['userId', 'provider'], { unique: true })
export class Storage extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'provider',
    type: 'enum',
    enum: StorageProvider
  })
  provider: StorageProvider;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @Column({ name: 'expiry_date', type: 'bigint', nullable: true })
  expiryDate: number;
}
