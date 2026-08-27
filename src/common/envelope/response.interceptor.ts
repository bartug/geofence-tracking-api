import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseEnvelope } from './response-envelope.interface';
import { ResponseHelper } from './response-helper';

/** Controller'lar zarfı elle kurmaz; bu interceptor her başarılı yanıtı { success, message, data, statusCode } şekline sarar. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponseEnvelope<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseEnvelope<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next
      .handle()
      .pipe(map((data) => ResponseHelper.success(data, response.statusCode)));
  }
}
