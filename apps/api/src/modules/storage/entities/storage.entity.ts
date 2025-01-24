import { Column, Entity, Index } from 'typeorm';

import { STORAGE_PROVIDER } from '@filo/libs/constants';
import { BaseEntity } from '@/commons/entities/base.entity';
import type { StorageProvider } from '@filo/interfaces';

@Entity('storage')
@Index('IDX_STORAGE_USER_PROVIDER', ['userId', 'provider'], { unique: true })
export class Storage extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'provider',
    type: 'enum',
    enum: STORAGE_PROVIDER
  })
  provider: StorageProvider;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @Column({ name: 'expiry_date', type: 'bigint', nullable: true })
  expiryDate: number;

  @Column({ name: 'refresh_token_expires_at', type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date;

  @Column({ name: 'last_updated', type: 'timestamp', nullable: true })
  lastUpdated: Date;
}
