import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

// Define a type for the request object augmented by Clerk middleware
// This helps with type safety when accessing request.auth
interface RequestWithAuth extends Request {
  auth?: {
    userId?: string;
    // Add other properties from Clerk's auth object if needed
  };
}

@Catch() // Catch all exceptions if no specific type is provided
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    // Cast the request to our custom type
    const request = ctx.getRequest<RequestWithAuth>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    // Use request.auth.userId provided by Clerk middleware
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
