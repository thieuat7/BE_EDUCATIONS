import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      // Lấy Token từ header Authorization dạng 'Bearer <token>'
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      // Truyền request vào validate để lấy raw token
      passReqToCallback: true,
    });
  }

  /**
   * Sau khi Passport xác thực Refresh Token thành công,
   * hàm này nhận request và payload đã giải mã.
   * Return value sẽ được gán vào req.user.
   */
  validate(req: Request, payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // Lấy raw refresh token từ header Authorization
    const authHeader = req.headers.authorization;
    const refreshToken = authHeader?.split(' ')[1];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tìm thấy');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      refreshToken,
    };
  }
}
