import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Lấy danh sách người dùng (Dành cho Admin)
  @Get()
  @UseAuth('Admin')
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    return this.usersService.findAll(+page, +limit, search);
  }

  @Get('stats')
  @UseAuth('Admin') // Chỉ Admin mới xem được thống kê chung
  async getStudentsStats() {
    const stats = await this.usersService.getStudentsAggregateStats();

    return {
      message: 'Lấy thống kê học sinh thành công',
      data: stats,
    };
  }

  // Lấy thống kê học tập của một học sinh
  @Get(':id/summary')
  // @UseAuth() // 💡 Bỏ comment dòng này nếu bạn yêu cầu phải đăng nhập mới được xem
  async getStudentSummary(@Param('id') id: string) {
    const summary = await this.usersService.getStudentSummary(+id);
    return {
      message: 'Lấy dữ liệu thống kê thành công',
      data: summary,
    };
  }

  @Get(':id')
  @UseAuth('Admin')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(+id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID = ${id}`);
    }
    return { success: true, user };
  }

  // Admin tạo người dùng mới
  @Post()
  @UseAuth('Admin')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      message: 'Tạo người dùng thành công',
      user,
    };
  }

  // Cập nhật người dùng
  @Patch(':id')
  @UseAuth('Admin')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(+id, updateUserDto);
    return {
      message: 'Cập nhật người dùng thành công',
      user,
    };
  }

  // Xóa người dùng
  @Delete(':id')
  @UseAuth('Admin')
  async remove(@Param('id') id: string) {
    try {
      await this.usersService.remove(+id);
      return {
        message: 'Xóa người dùng thành công',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID = ${id}`);
      }
      throw error;
    }
  }
}
