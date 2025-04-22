import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    // TODO: Extract user ID if available in request context (e.g., from auth middleware)
    const userId = request.user?.id || 'anonymous';

    this.logger.log(`[${userId}] ${method} ${url} - Request received`);

    return next.handle().pipe(
      tap(response => {
        const responseStatus = context.switchToHttp().getResponse().statusCode;
        this.logger.log(
          `[${userId}] ${method} ${url} - Response sent: ${responseStatus} (${Date.now() - now}ms)`
        );
      })
    );
  }
}
