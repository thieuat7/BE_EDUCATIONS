import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@modules/roles/entities/role.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * HÀM TÌM KIẾM TỔNG HỢP (THAY THẾ CHO 7 HÀM CŨ)
   * Giúp lấy User kèm theo Password hoặc Roles một cách linh hoạt
   */
  async findOne(
    where: FindOptionsWhere<User>,
    options: { includePassword?: boolean; includeRoles?: boolean } = {},
  ): Promise<User | null> {
    const query = this.userRepository.createQueryBuilder('user');

    query.where(where);

    // Lấy thêm các trường nhạy cảm bị ẩn (password, refreshToken)
    if (options.includePassword) {
      query.addSelect(['user.password', 'user.currentHashedRefreshToken']);
    }

    // Join lấy thêm Roles
    if (options.includeRoles) {
      query.leftJoinAndSelect('user.roles', 'role');
    }

    return await query.getOne();
  }

  // --- Các hàm tiện ích giúp code ở các tầng khác ngắn gọn hơn ---

  async findById(id: number, includeRoles = false) {
    return this.findOne({ id }, { includeRoles });
  }

  async findByEmail(email: string, includeRoles = false) {
    return this.findOne({ email }, { includeRoles });
  }

  async findByPublicId(publicId: string, includeRoles = false) {
    return this.findOne({ publicId }, { includeRoles });
  }

  // --- Logic nghiệp vụ chính ---

  /**
   * Tạo người dùng mới và gán role mặc định
   */
  async create(userData: Partial<User>): Promise<User> {
    // 1. Tìm role mặc định là 'user'
    const defaultRole = await this.roleRepository.findOne({
      where: { name: 'user' },
    });

    // 2. Tạo instance user và gán role ngay từ đầu
    const newUser = this.userRepository.create({
      ...userData,
      roles: defaultRole ? [defaultRole] : [],
    });

    return await this.userRepository.save(newUser);
  }

  /**
   * Cập nhật thông tin người dùng
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với id=${id}`);
    }

    // Kiểm tra trùng email
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new BadRequestException('Email này đã được sử dụng!');
      }
    }

    // Băm mật khẩu nếu có thay đổi
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Merge dữ liệu mới vào instance cũ (TypeORM sẽ lo việc mapping camelCase)
    const updatedUser = this.userRepository.merge(user, updateUserDto);
    return await this.userRepository.save(updatedUser);
  }

  /**
   * Quản lý Refresh Token
   */
  async setCurrentRefreshToken(
    currentHashedRefreshToken: string | null,
    userId: number,
  ): Promise<void> {
    const result = await this.userRepository.update(userId, {
      currentHashedRefreshToken,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        'Không thể cập nhật token: User không tồn tại',
      );
    }
  }

  /**
   * Xóa người dùng (Soft Delete)
   */
  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với id=${id}`);
    }

    await this.userRepository.softRemove(user);
    return { message: 'Xóa người dùng thành công (Soft Delete)' };
  }
}
