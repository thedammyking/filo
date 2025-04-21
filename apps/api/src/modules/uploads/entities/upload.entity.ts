import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/commons/entities/base.entity';
import { UPLOAD_STATUS, UPLOAD_TYPE } from '@filo/libs/constants';
import type { UploadStatus, UploadType } from '@filo/interfaces';
import { Storage } from '@/modules/storage/entities/storage.entity';
import { Transform } from 'class-transformer';

@Entity('uploads')
@Index('IDX_UPLOADS_USER_ID', ['userId'], { unique: false })
export class Upload extends BaseEntity {
  @Column()
  link: string;

  @Column({
    type: 'enum',
    enum: UPLOAD_TYPE,
    default: UPLOAD_TYPE.FILE
  })
  type: UploadType;

  @Column({
    type: 'enum',
    enum: UPLOAD_STATUS,
    default: UPLOAD_STATUS.PENDING
  })
  status: UploadStatus;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Transform(({ value }) => ({
    id: value.id,
    provider: value.provider
  }))
  @ManyToOne(() => Storage, storage => storage.uploads)
  storage: Storage;
}
