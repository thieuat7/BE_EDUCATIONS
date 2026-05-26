import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';

@ApiTags('Admin - Exams')
@ApiBearerAuth()
@Controller('admin/exams')
@UseAuth('Admin')
export class AdminExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Lấy thống kê tổng quan toàn bộ hệ thống thi (Admin)' })
  @ApiResponse({ status: 200, description: 'Thống kê tổng quan thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  getGeneralStatistics() {
    return this.examsService.getGeneralStatistics();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo đề thi mới (Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo đề thi thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  create(@Body() createExamDto: CreateExamDto) {
    return this.examsService.create(createExamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả đề thi bao gồm nháp và đã ẩn (Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách đề thi thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  findAll() {
    return this.examsService.findAllForAdmin();
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Lấy thống kê của một đề thi cụ thể (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của đề thi', type: Number })
  @ApiResponse({ status: 200, description: 'Thống kê đề thi thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đề thi' })
  getExamStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getExamStatistics(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một đề thi (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của đề thi', type: Number })
  @ApiResponse({ status: 200, description: 'Chi tiết đề thi thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đề thi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật đề thi (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của đề thi cần cập nhật', type: Number })
  @ApiResponse({ status: 200, description: 'Cập nhật đề thi thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đề thi' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.update(id, updateExamDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đề thi (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của đề thi cần xóa', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa đề thi thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đề thi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.remove(id);
  }
}
