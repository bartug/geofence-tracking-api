import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseEnvelope } from '../envelope/response-envelope.interface';

/** Tüm hataları { success:false, message, data:null, statusCode } zarfına çevirir; çoklu validasyon hatasında ilkini gösterir. */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = this.extractMessage(
        exception.getResponse(),
        exception.message,
      );
      response.status(status).json(this.envelope(message, status));
      return;
    }

    this.logger.error(
      'Beklenmeyen hata',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.envelope(
          'Beklenmeyen bir hata oluştu',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
  }

  private envelope(
    message: string,
    statusCode: number,
  ): ApiResponseEnvelope<null> {
    return { success: false, message, data: null, statusCode };
  }

  private extractMessage(
    exceptionResponse: string | object,
    fallback: string,
  ): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const message = (exceptionResponse as { message?: string | string[] })
      .message;
    if (Array.isArray(message)) {
      return message[0] ?? fallback;
    }

    return typeof message === 'string' ? message : fallback;
  }
}
