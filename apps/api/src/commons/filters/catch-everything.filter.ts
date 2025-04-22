import type { ServerResponse } from '@filo/interfaces';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import { Request, Response } from 'express';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  private readonly logger = new Logger(CatchEverythingFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    this.logger.error(
      `Unhandled Exception: ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception
    );

    let responseData: any;
    let message: string;

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();
      message =
        (typeof errorResponse === 'object' && errorResponse['message']) || exception.message;
      responseData = errorResponse;
    } else {
      message = 'Internal Server Error';
      responseData = { statusCode: status, message: message };
    }

    const responseJson: ServerResponse<unknown> = {
      status: false,
      statusCode: status,
      path: request.url,
      message: message,
      data: responseData,
      timestamp: format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss'),
      stack: isProduction || !(exception instanceof Error) ? undefined : exception.stack
    };

    response.status(status).json(responseJson);
  }
}
