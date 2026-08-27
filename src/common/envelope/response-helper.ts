import { HttpStatus } from '@nestjs/common';
import { ApiResponseEnvelope } from './response-envelope.interface';

export const ResponseHelper = {
  success<T>(
    data: T,
    statusCode: number = HttpStatus.OK,
    message = 'OK',
  ): ApiResponseEnvelope<T> {
    return { success: true, message, data, statusCode };
  },
};
