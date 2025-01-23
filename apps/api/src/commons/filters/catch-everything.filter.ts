import type { ServerResponse } from '@filo/interfaces';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { format } from 'date-fns';
import { Request, Response } from 'express';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let responseJson: ServerResponse<unknown> = {
      status: false,
      statusCode: status,
      path: request.url,
      data: exception,
      timestamp: format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss')
    };

    response.status(status).json(responseJson);
  }
}
