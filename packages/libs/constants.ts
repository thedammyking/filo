export const STORAGE_PROVIDER = Object.freeze({
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  DROPBOX: 'DROPBOX',
  ONE_DRIVE: 'ONE_DRIVE'
});

export const AVAILABILITY_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const STORAGE_PROVIDER_DETAILS = Object.freeze({
  [STORAGE_PROVIDER.GOOGLE_DRIVE]: {
    name: 'Google Drive',
    value: STORAGE_PROVIDER.GOOGLE_DRIVE,
    status: AVAILABILITY_STATUS.AVAILABLE
  },
  [STORAGE_PROVIDER.DROPBOX]: {
    name: 'Dropbox',
    value: STORAGE_PROVIDER.DROPBOX,
    status: AVAILABILITY_STATUS.UNAVAILABLE
  },
  [STORAGE_PROVIDER.ONE_DRIVE]: {
    name: 'One Drive',
    value: STORAGE_PROVIDER.ONE_DRIVE,
    status: AVAILABILITY_STATUS.UNAVAILABLE
  }
});

export const UPLOAD_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed'
});

export const UPLOAD_TYPE = Object.freeze({
  FILE: 'file',
  MAGNET: 'magnet'
});
