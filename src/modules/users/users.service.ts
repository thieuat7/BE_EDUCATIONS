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

// ... (Giữ nguyên phần type UserInput và function normalizeUserInput của bạn)
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

  async findAll(page: number = 1, limit: number = 10, search: string = '') {
    // 1. TẠO QUERY LẤY DỮ LIỆU VÀ THỐNG KÊ
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.results', 'result')
      .select([
        'user.UserID AS id',
        'user.FullName AS fullName',
        'user.Email AS email',
        'user.Role AS role',
        'user.DateCreated AS dateCreated',
      ])
      .addSelect('COUNT(result.ResultID)', 'totalExams')
      .addSelect('ROUND(AVG(result.Score), 2)', 'averageScore')
      .addSelect('MAX(result.Score)', 'highestScore')
      // 💡 Thêm điều kiện: CHỈ LẤY NHỮNG AI KHÔNG PHẢI LÀ ADMIN
      .where('user.Role != :adminRole', { adminRole: UserRole.ADMIN })
      .groupBy('user.UserID');

    // Áp dụng điều kiện tìm kiếm (💡 Lưu ý dấu ngoặc tròn bao quanh lệnh OR)
    if (search) {
      query.andWhere(
        '(user.FullName LIKE :search OR user.Email LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    // Sắp xếp và phân trang
    query.orderBy('user.DateCreated', 'DESC');
    query.offset((page - 1) * limit).limit(limit);

    // Lấy dữ liệu thô
    const rawUsers = await query.getRawMany();

    // Chuẩn hóa kiểu dữ liệu
    const formattedUsers = rawUsers.map((user) => ({
      ...user,
      totalExams: parseInt(user.totalExams || '0', 10),
      averageScore: parseFloat(user.averageScore || '0'),
      highestScore: parseFloat(user.highestScore || '0'),
    }));

    // 2. TẠO QUERY CHỈ ĐỂ ĐẾM TỔNG SỐ USER (Cũng phải lọc Admin và bọc ngoặc tìm kiếm)
    const countQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.Role != :adminRole', { adminRole: UserRole.ADMIN });

    if (search) {
      countQuery.andWhere(
        '(user.FullName LIKE :search OR user.Email LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }
    const total = await countQuery.getCount();

    // 3. TRẢ VỀ KẾT QUẢ CUỐI CÙNG
    return {
      data: formattedUsers,
      total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * API: Lấy thống kê chi tiết của một học sinh
   */
  async getStudentSummary(userId: number) {
    // 1. Kiểm tra xem học sinh có tồn tại không
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID = ${userId}`,
      );
    }

    // 2. Tính toán thống kê thông qua QueryBuilder
    const stats = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.results', 'result') // Phải đảm bảo Entity User có khai báo @OneToMany với kết quả
      .where('user.UserID = :userId', { userId })
      .select([
        'COUNT(result.ResultID) AS totalExams',
        'ROUND(AVG(result.Score), 2) AS averageScore',
        'MAX(result.Score) AS highestScore',
        'MIN(result.Score) AS lowestScore',
        'SUM(result.TimeTaken) AS totalTimeTaken',
      ])
      .getRawOne();

    // 3. Chuẩn hóa dữ liệu trả về (ép kiểu từ chuỗi SQL sang số)
    return {
      userInfo: {
        id: user.UserID,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role,
        dateCreated: user.DateCreated,
      },
      learningStats: {
        totalExams: parseInt(stats?.totalExams || '0', 10),
        averageScore: parseFloat(stats?.averageScore || '0'),
        highestScore: parseFloat(stats?.highestScore || '0'),
        lowestScore: parseFloat(stats?.lowestScore || '0'),
        totalTimeTaken: parseInt(stats?.totalTimeTaken || '0', 10), // Đơn vị: Giây (hoặc phút tùy bạn lưu)
      },
    };
  }

  /**
   * API: Thống kê tổng quan tình hình học tập của tất cả Học Sinh
   */
  async getStudentsAggregateStats() {
    const [studentCount, resultStats] = await Promise.all([
      // 1. Đếm tổng số lượng học sinh (Bỏ qua Admin)
      this.userRepository.count({ where: { Role: UserRole.HOC_SINH } }),

      // 2. Đếm tổng lượt thi và tính điểm trung bình từ bảng Result
      this.userRepository.query(`
        SELECT 
          COUNT(ResultID) as totalTakes, 
          ROUND(AVG(Score), 2) as averageScore 
        FROM Result
      `),
    ]);

    return {
      totalStudents: studentCount,
      totalExamTakes: parseInt(resultStats[0].totalTakes, 10) || 0,
      averageScore: parseFloat(resultStats[0].averageScore) || 0,
    };
  }

  // --- Logic nghiệp vụ chính ---
  async create(userData: UserInput): Promise<User> {
    const normalizedUserData = normalizeUserInput(userData);

    // Kiểm tra email trùng lặp khi tạo mới
    if (normalizedUserData.Email) {
      const existingUser = await this.findByEmail(normalizedUserData.Email);
      if (existingUser) {
        throw new BadRequestException('Email này đã được sử dụng!');
      }
    }

    if (normalizedUserData.Password) {
      normalizedUserData.Password = await bcrypt.hash(
        normalizedUserData.Password,
        10,
      );
    }

    const newUser = this.userRepository.create(normalizedUserData);
    return await this.userRepository.save(newUser);
  }

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

  async updateRefreshToken(
    id: number,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userRepository.update(id, { RefreshToken: refreshToken });
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID = ${id}`);
    }

    await this.userRepository.remove(user);
    return { message: 'Xóa người dùng thành công' };
  }
}
