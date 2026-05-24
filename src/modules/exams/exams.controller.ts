import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // 1. Tạo đề thi (Admin)
  @Post()
  create(@Body() createExamDto: CreateExamDto) {
    return this.examsService.create(createExamDto);
  }

  // 2. Lấy danh sách đề thi
  @Get()
  findAll() {
    return this.examsService.findAll();
  }

  // 3. Lấy thông tin thống kê của đề thi
  @Get(':id/statistics')
  getStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getExamStatistics(id);
  }

  // 4. Lấy đề thi để làm bài (Ẩn đáp án đúng)
  @Get(':id/take')
  getExamForTaking(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getExamForTaking(id);
  }

  // 5. Nộp bài thi
  @Post(':id/submit')
  @UseAuth() // Yêu cầu người dùng phải đăng nhập để nộp bài,
  async submitExam(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('userId') userId: number,
    @Body() submitExamDto: SubmitExamDto,
  ) {
    return await this.examsService.submitExam(
      userId,
      id,
      submitExamDto.answers,
      submitExamDto.timeSpent,
    );
  }
  // 6. Lấy chi tiết đề thi (Dành cho Admin xem lại)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.findOne(id);
  }

  // 7. Cập nhật đề thi
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.update(id, updateExamDto);
  }

  // 8. Xóa đề thi
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.remove(id);
  }
}
