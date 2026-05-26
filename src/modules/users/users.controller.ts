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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Lấy danh sách người dùng (Admin)' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Trang hiện tại (mặc định: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số người dùng mỗi trang (mặc định: 10)',
    type: Number,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Từ khóa tìm kiếm',
  })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    return this.usersService.findAll(+page, +limit, search);
  }

  @Get('stats')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Lấy thống kê tổng hợp của học sinh (Admin)' })
  @ApiResponse({ status: 200, description: 'Thống kê học sinh thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async getStudentsStats() {
    const stats = await this.usersService.getStudentsAggregateStats();
    return { message: 'Lấy thống kê học sinh thành công', data: stats };
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Lấy thống kê học tập của một học sinh' })
  @ApiParam({ name: 'id', description: 'ID của học sinh', type: Number })
  @ApiResponse({ status: 200, description: 'Thống kê học sinh thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async getStudentSummary(@Param('id') id: string) {
    const summary = await this.usersService.getStudentSummary(+id);
    return { message: 'Lấy dữ liệu thống kê thành công', data: summary };
  }

  @Get(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một người dùng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({ status: 200, description: 'Chi tiết người dùng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(+id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID = ${id}`);
    }
    return { success: true, user };
  }

  @Post()
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Admin tạo người dùng mới' })
  @ApiResponse({ status: 201, description: 'Tạo người dùng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return { message: 'Tạo người dùng thành công', user };
  }

  @Patch(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng (Admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID của người dùng cần cập nhật',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Cập nhật người dùng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(+id, updateUserDto);
    return { message: 'Cập nhật người dùng thành công', user };
  }

  @Delete(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Xóa người dùng (Admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID của người dùng cần xóa',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Xóa người dùng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async remove(@Param('id') id: string) {
    try {
      await this.usersService.remove(+id);
      return { message: 'Xóa người dùng thành công' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID = ${id}`);
      }
      throw error;
    }
  }
}
