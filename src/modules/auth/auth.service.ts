import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  // 1. Đăng ký tài khoản
  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng!');
    }

    const newUser = await this.usersService.create({
      Email: dto.email,
      FullName: dto.fullName,
      Password: dto.password,
    });

    return {
      user: {
        id: newUser.UserID,
        email: newUser.Email,
        fullName: newUser.FullName,
        role: newUser.Role,
      },
    };
  }

  // 2. Đăng nhập
  async login(dto: LoginDto) {
    const user = await this.usersService.findOne(
      { Email: dto.email },
      { includePassword: true },
    );

    if (!user || !user.Password) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.Password);
    if (!isPasswordValid) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    const roles = [user.Role];

    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(user.UserID, user.Email, roles);

    // Lưu Refresh Token vào Database
    await this.usersService.updateRefreshToken(user.UserID, refreshToken);

    return {
      user: {
        id: user.UserID,
        email: user.Email,
        fullName: user.FullName,
        roles: roles,
      },
      token: {
        accessToken,
        refreshToken,
      },
    };
  }

  async getMe(userId: number) {
    return this.usersService.findById(userId);
  }

  // 3. Làm mới Token
  async refreshToken(userId: number, providedRefreshToken: string) {
    const user = await this.usersService.findById(userId);

    // Kiểm tra xem User có tồn tại và có đang sở hữu refresh token không
    if (!user || !user.RefreshToken) {
      throw new UnauthorizedException(
        'Truy cập bị từ chối. Vui lòng đăng nhập lại.',
      );
    }

    // So sánh token client gửi lên với token lưu trong DB
    if (user.RefreshToken !== providedRefreshToken) {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn.',
      );
    }

    const roles = [user.Role];

    // Cấp phát bộ token mới
    const { accessToken, refreshToken: newRefreshToken } =
      await this.tokenService.generateTokens(user.UserID, user.Email, roles);

    // Lưu Refresh Token mới vào DB (xoay vòng token - token rotation)
    await this.usersService.updateRefreshToken(user.UserID, newRefreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // 4. Đăng xuất
  async logout(userId: number) {
    // Đặt Refresh Token trong DB về null để vô hiệu hóa token cũ
    await this.usersService.updateRefreshToken(userId, null);

    return { message: 'Đăng xuất thành công' };
  }
}
