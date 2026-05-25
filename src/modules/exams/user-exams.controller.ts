import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@Controller('exams')
export class UserExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // 1. Lấy danh sách đề thi
  @Get()
  findAvailableExams() {
    return this.examsService.findAvailableExams();
  }

  // 2. Lấy đề thi để làm bài (Đã ẩn đáp án đúng)
  @Get(':id/take')
  getExamForTaking(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getExamForTaking(id);
  }

  // 3. Nộp bài thi
  @Post(':id/submit')
  @UseAuth() // Yêu cầu đăng nhập
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
}
