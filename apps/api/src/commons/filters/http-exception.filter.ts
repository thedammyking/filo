import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch() // Catch all exceptions if no specific type is provided
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    // Use the standard Request type, which is now augmented globally
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    // Use request.auth.userId provided by Clerk middleware
    // The 'auth' property on 'request' will be typed as AuthObject (from globals.d.ts)
    const userId = request.auth?.userId || 'anonymous';
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message
    };

    this.logger.error(
      `[${userId}] ${request.method} ${request.url} - Error ${status}: ${message}`,
      exception instanceof Error ? exception.stack : '' // Log stack trace if available
    );

    response.status(status).json(errorResponse);
  }
}
