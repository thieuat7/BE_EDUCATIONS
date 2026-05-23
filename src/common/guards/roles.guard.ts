import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RequestUser } from '@modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 2. Lấy danh sách roles yêu cầu từ decorator @Roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu API không yêu cầu role nào cụ thể, cho phép đi qua
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Ép kiểu Request để TypeScript biết chắc chắn có thuộc tính 'user'
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();
    const user = request.user;

    // 4. Kiểm tra sự tồn tại của user và roles
    if (!user || !user.roles) {
      throw new ForbiddenException('Không tìm thấy thông tin quyền hạn');
    }

    // 5. Kiểm tra quyền (Sử dụng some và includes trên mảng string[])
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tài nguyên này',
      );
    }

    return true;
  }
}
