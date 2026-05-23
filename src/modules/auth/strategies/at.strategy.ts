import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      // Lấy Token từ header Authorization dạng 'Bearer <token>'
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Sau khi Passport giải mã JWT thành công, dữ liệu sẽ được chuyển vào đây.
   * Những gì hàm này return sẽ được gán trực tiếp vào 'req.user'.
   */
  validate(payload: JwtPayload) {
    // Kiểm tra tính hợp lệ cơ bản của payload
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    // 2. Trả về object chứa đầy đủ thông tin cần thiết cho req.user
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
