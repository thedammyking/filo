import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

import { generatePrefixedUUID } from '@/lib/utils';
import { StorageProvider } from '../constants/storage-provider.enum';

@Entity('storage')
export class Storage {
  @PrimaryColumn({
    name: 'id',
    unique: true
  })
  id: string = generatePrefixedUUID('storage');

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
