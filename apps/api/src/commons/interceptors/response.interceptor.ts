import type { ServerResponse } from '@filo/interfaces';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { format } from 'date-fns';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { RESPONSE_MESSAGE_METADATA } from '@/commons/decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ServerResponse<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ServerResponse<T>> {
    return next.handle().pipe(map((res: unknown) => this.responseHandler(res, context)));
  }

  responseHandler(res: any, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_METADATA, context.getHandler()) || 'success';

    return {
      status: true,
      path: request.url,
      message: message,
      statusCode,
      data: res,
      timestamp: format(new Date().toISOString(), 'yyyy-MM-dd HH:mm:ss')
    };
  }
}
