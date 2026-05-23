import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Định nghĩa giao diện phản hồi chuẩn
interface StandardResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data: T): StandardResponse<T> => {
        let message = 'Success';
        let finalData = data;

        // 2. Kiểm tra xem data có phải là object và có chứa trường message không
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Ép kiểu tạm thời sang Record để truy cập thuộc tính một cách an toàn theo luật ESLint
          const dataObj = data as Record<string, unknown>;

          if (typeof dataObj.message === 'string') {
            message = dataObj.message;

            // 3. Nếu data chỉ chứa duy nhất trường message, đặt data trả về là null
            if (Object.keys(dataObj).length === 1) {
              finalData = null as T;
            }
          }
        }

        // 4. Trả về object với đầy đủ kiểu dữ liệu đã xác định
        return {
          success: true,
          message: message,
          data: finalData,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
