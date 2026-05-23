import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AtGuard } from '@common/guards/at.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

export function UseAuth(...roles: string[]) {
  return applyDecorators(
    Roles(...roles),

    //Kích hoạt cả AtGuard (xác thực) và RolesGuard (phân quyền)
    UseGuards(AtGuard, RolesGuard),

    ApiBearerAuth('access-token'),

    ApiResponse({
      status: 401,
      description: 'Chưa xác thực hoặc Token không hợp lệ',
    }),
    ApiResponse({
      status: 403,
      description: 'Bạn không có quyền thực hiện hành động này',
    }),
  );
}
