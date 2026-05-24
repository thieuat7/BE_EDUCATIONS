import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

type UserInput = Partial<{
  FullName: string;
  Email: string;
  Password: string;
  Role: UserRole;
  RefreshToken: string;
  fullName: string;
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  refreshToken: string;
}>;

function normalizeUserInput(input: UserInput): Partial<User> {
  const normalizedInput: Partial<User> = {};

  const fullName = input.FullName ?? input.fullName ?? input.full_name;
  const email = input.Email ?? input.email;
  const password = input.Password ?? input.password;
  const role = input.Role ?? input.role;
  const refreshToken = input.RefreshToken ?? input.refreshToken;

  if (fullName !== undefined) {
    normalizedInput.FullName = fullName;
  }

  if (email !== undefined) {
    normalizedInput.Email = email;
  }

  if (password !== undefined) {
    normalizedInput.Password = password;
  }

  if (role !== undefined) {
    normalizedInput.Role = role;
  }

  if (refreshToken !== undefined) {
    normalizedInput.RefreshToken = refreshToken;
  }

  return normalizedInput;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * HÀM TÌM KIẾM TỔNG HỢP
   */
  async findOne(
    where: FindOptionsWhere<User>,
    options: { includePassword?: boolean } = {},
  ): Promise<User | null> {
    const query = this.userRepository.createQueryBuilder('user');

    query.where(where);

    // Lấy thêm Password nếu cần thiết
    if (options.includePassword) {
      query.addSelect('user.Password');
    }

    return await query.getOne();
  }

  // --- Các hàm tiện ích ---

  async findById(id: number) {
    return this.findOne({ UserID: id });
  }

  async findByEmail(email: string) {
    return this.findOne({ Email: email });
  }

  // --- Logic nghiệp vụ chính ---

  /**
   * Tạo người dùng mới
   */
  async create(userData: UserInput): Promise<User> {
    const normalizedUserData = normalizeUserInput(userData);

    if (normalizedUserData.Password) {
      normalizedUserData.Password = await bcrypt.hash(
        normalizedUserData.Password,
        10,
      );
    }

    const newUser = this.userRepository.create(normalizedUserData);

    return await this.userRepository.save(newUser);
  }

  /**
   * Cập nhật thông tin người dùng
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID = ${id}`);
    }

    const normalizedUpdate = normalizeUserInput(updateUserDto);
    const newEmail = normalizedUpdate.Email;
    const newPassword = normalizedUpdate.Password;

    if (newEmail && newEmail !== user.Email) {
      const existingUser = await this.findByEmail(newEmail);
      if (existingUser) {
        throw new BadRequestException('Email này đã được sử dụng!');
      }
    }

    if (newPassword) {
      normalizedUpdate.Password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = this.userRepository.merge(user, normalizedUpdate);
    return await this.userRepository.save(updatedUser);
  }

  /**
   * Cập nhật Refresh Token
   */
  async updateRefreshToken(
    id: number,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userRepository.update(id, {
      RefreshToken: refreshToken,
    });
  }
  /**
   * Xóa người dùng (Hard Delete)
   */
  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID = ${id}`);
    }

    await this.userRepository.remove(user);
    return { message: 'Xóa người dùng thành công' };
  }
}
