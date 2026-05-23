import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

// Định nghĩa giao diện cho cấu trúc lỗi của NestJS
interface NestErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. Xác định Status Code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 2. Khởi tạo message mặc định
    let message = 'Internal server error';

    // 3. Trích xuất thông báo lỗi một cách an toàn
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const nestError = exceptionResponse as NestErrorResponse;

        if (nestError.message) {
          message = Array.isArray(nestError.message)
            ? nestError.message[0]
            : nestError.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 4. Trả về phản hồi đã được định dạng chuẩn (Đã thêm statusCode)
    response.status(status).json({
      success: false,
      message: message,
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
}
