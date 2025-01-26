import { Column, Entity, Index, OneToMany } from 'typeorm';

import { STORAGE_PROVIDER } from '@filo/libs/constants';
import { BaseEntity } from '@/commons/entities/base.entity';
import type { StorageProvider } from '@filo/interfaces';
import { Upload } from '@/modules/uploads/entities/upload.entity';
import { Exclude, Transform } from 'class-transformer';

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

  @Exclude()
  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Exclude()
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @Exclude()
  @Column({ name: 'expiry_date', type: 'bigint', nullable: true })
  expiryDate: number;

  @Exclude()
  @Column({ name: 'refresh_token_expires_at', type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date;

  @Column({ name: 'last_updated', type: 'timestamp', nullable: true })
  lastUpdated: Date;

  @Transform(({ value }) => value.map(upload => upload.id))
  @OneToMany(() => Upload, upload => upload.storage)
  uploads: Upload[];
}
