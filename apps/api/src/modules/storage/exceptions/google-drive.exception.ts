import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleDriveErrorResponse {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Failed to refresh access token' })
  message: string;

  @ApiProperty({ example: 'REFRESH_FAILED' })
  errorCode?: string;
}

export class GoogleDriveException extends HttpException {
  constructor(message: string, errorCode?: string) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        errorCode
      },
      HttpStatus.UNAUTHORIZED
    );
  }
}
