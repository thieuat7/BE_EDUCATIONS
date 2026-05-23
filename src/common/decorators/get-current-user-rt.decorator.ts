import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayloadWithRt } from '@modules/auth/interfaces/jwt-payload.interface';

type RequestWithUserRt = Request & { user: JwtPayloadWithRt };

export const GetCurrentUserRt = createParamDecorator(
  (data: keyof JwtPayloadWithRt | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUserRt>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
