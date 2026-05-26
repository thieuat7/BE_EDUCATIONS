import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { SubmitExamDto } from './dto/submit-exam.dto';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { GetCurrentUser } from '@common/decorators/get-current-user.decorator';

@ApiTags('Exams')
@Controller('exams')
export class UserExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đề thi khả dụng' })
  @ApiResponse({ status: 200, description: 'Danh sách đề thi thành công' })
  findAvailableExams() {
    return this.examsService.findAvailableExams();
  }

  @Get(':id/take')
  @ApiOperation({ summary: 'Lấy đề thi để làm bài (đáp án đúng đã được ẩn)' })
  @ApiParam({ name: 'id', description: 'ID của đề thi', type: Number })
  @ApiResponse({ status: 200, description: 'Đề thi làm bài thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đề thi' })
  getExamForTaking(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getExamForTaking(id);
  }

  @Post(':id/submit')
  @UseAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nộp bài thi (yêu cầu đăng nhập)' })
  @ApiParam({ name: 'id', description: 'ID của đề thi', type: Number })
  @ApiResponse({ status: 201, description: 'Nộp bài thành công, trả về kết quả' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đề thi' })
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
