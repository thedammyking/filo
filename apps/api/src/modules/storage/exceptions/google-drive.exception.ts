import { UnauthorizedException } from '@nestjs/common';

export class GoogleDriveException extends UnauthorizedException {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
  }
}
