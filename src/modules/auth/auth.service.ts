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
    // Sử dụng hàm findOne mới để kiểm tra email
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng!');
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Lưu người dùng mới (Service đã tự động gán role 'user' mặc định)
    const newUser = await this.usersService.create({
      ...dto,
      fullName: dto.fullName,
      password: hashedPassword,
    });

    return {
      user: {
        id: newUser.publicId,
        email: newUser.email,
        fullName: newUser.fullName,
      },
    };
  }

  // 2. Đăng nhập
  async login(dto: LoginDto) {
    // Lấy user kèm cả Password và Roles chỉ với 1 lần gọi hàm findOne
    const user = await this.usersService.findOne(
      { email: dto.email },
      { includePassword: true, includeRoles: true },
    );

    if (!user || !user.password) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    // Trích xuất danh sách tên Roles (Ví dụ: ['user', 'admin'])
    const roleNames = user.roles?.map((role) => role.name) || [];

    // Tạo bộ Access + Refresh token
    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(user.id, user.email, roleNames);

    // Lưu hash của refresh token vào DB (Sử dụng hàm update đã tối ưu)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.setCurrentRefreshToken(hashedRefreshToken, user.id);

    return {
      user: {
        id: user.publicId,
        email: user.email,
        fullName: user.fullName,
        roles: roleNames,
      },
      token: {
        accessToken,
        refreshToken,
      },
    };
  }

  // 3. Làm mới Token
  async refreshToken(userId: number, refreshToken: string) {
    // Lấy user kèm theo hashedRefreshToken và Roles
    const user = await this.usersService.findOne(
      { id: userId },
      { includePassword: true, includeRoles: true },
    );

    if (!user || !user.currentHashedRefreshToken) {
      throw new UnauthorizedException('Phiên làm việc đã hết hạn');
    }

    // Kiểm tra tính hợp lệ của refresh token gửi lên
    const isTokenValid = await bcrypt.compare(
      refreshToken,
      user.currentHashedRefreshToken,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const roleNames = user.roles?.map((role) => role.name) || [];

    // Tạo bộ token mới
    const { accessToken, refreshToken: newRefreshToken } =
      await this.tokenService.generateTokens(user.id, user.email, roleNames);

    // Cập nhật lại hash mới vào DB
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.usersService.setCurrentRefreshToken(hashedRefreshToken, user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // 4. Đăng xuất
  async logout(userId: number) {
    // Truyền null để xóa token trong DB
    await this.usersService.setCurrentRefreshToken(null, userId);
    return { message: 'Đăng xuất thành công' };
  }
}
