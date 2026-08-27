import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain-özel exception'ların ortak atası; alan bazlı exception'lar bunu
 * extend eder — ilgili modülde, ihtiyaç doğduğunda tanımlanır.
 */
export class AppException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }
}
