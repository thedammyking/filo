import type { ServerResponse } from '@filo/interfaces';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { format } from 'date-fns';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let responseJson: ServerResponse<HttpException> = {
      status: false,
      statusCode: status,
      path: request.url,
      message: exception.message,
      data: exception,
      timestamp: format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss')
    };

    if (request.query.debug === 'true') {
      responseJson = {
        ...responseJson,
        stack: exception.stack
      };
    }

    response.status(status).json(responseJson);
  }
}
