import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '@modules/auth/interfaces/jwt-payload.interface';

// Định nghĩa kiểu Request có chứa user
type RequestWithUser = Request & { user: RequestUser };

export const GetCurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
