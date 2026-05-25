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
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
@Controller('admin/exams')
@UseAuth('Admin')
export class AdminExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // 1. API Mới: Lấy thông tin thống kê tổng quan của toàn bộ hệ thống thi
  @Get('statistics/overview')
  getGeneralStatistics() {
    // Cần bổ sung hàm này vào ExamsService
    return this.examsService.getGeneralStatistics();
  }

  // 2. Tạo đề thi
  @Post()
  create(@Body() createExamDto: CreateExamDto) {
    return this.examsService.create(createExamDto);
  }

  // 3. Lấy TẤT CẢ danh sách đề thi (Bao gồm cả nháp, đã ẩn)
  @Get()
  findAll() {
    return this.examsService.findAllForAdmin();
  }

  // 4. Lấy thống kê của MỘT đề thi cụ thể
  @Get(':id/statistics')
  getExamStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getExamStatistics(id);
  }

  // 5. Lấy chi tiết đề thi
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.findOne(id);
  }

  // 6. Cập nhật đề thi
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.update(id, updateExamDto);
  }

  // 7. Xóa đề thi
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.remove(id);
  }
}
