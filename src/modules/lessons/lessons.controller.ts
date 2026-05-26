import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
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
import { LessonsService } from './lessons.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseAuth()
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài học theo chương' })
  @ApiQuery({
    name: 'chapterId',
    required: true,
    description: 'ID chương (có thể truyền nhiều)',
    isArray: true,
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài học thành công' })
  @ApiResponse({ status: 400, description: 'Thiếu tham số chapterId' })
  async listLessons(@Query('chapterId') chapterId: string | string[]) {
    if (!chapterId) {
      throw new BadRequestException('The chapterId parameter is required');
    }
    const chapterIds = Array.isArray(chapterId) ? chapterId : [chapterId];
    const lessons = await this.lessonsService.getLessonsByChapters(chapterIds);
    const formatted = lessons.map((lesson) => ({
      id: lesson.LessonID,
      name: lesson.LessonName,
      chapterId: lesson.ChapterID,
    }));
    return { lessons: formatted, total: formatted.length };
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Lấy tổng quan tất cả bài học kèm số lượng kỹ năng',
  })
  @ApiResponse({ status: 200, description: 'Tổng quan bài học thành công' })
  async listLessonsSummary() {
    const lessons = await this.lessonsService.getAllLessonsWithSkillCount();
    return { success: true, lessons, total: lessons.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một bài học' })
  @ApiParam({ name: 'id', description: 'ID của bài học' })
  @ApiResponse({ status: 200, description: 'Chi tiết bài học thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async getLesson(@Param('id') id: string) {
    const lesson = await this.lessonsService.getLessonById(id);
    if (!lesson) throw new NotFoundException('Lesson not found');
    return {
      lesson: {
        id: lesson.LessonID,
        name: lesson.LessonName,
        chapter: {
          id: lesson.Chapter?.ChapterID,
          name: lesson.Chapter?.ChapterName,
        },
      },
    };
  }

  @Post()
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Tạo bài học mới (Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo bài học thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async createLesson(@Body() createLessonDto: CreateLessonDto) {
    const lesson = await this.lessonsService.createLesson(
      createLessonDto.lessonId,
      createLessonDto.lessonName,
      createLessonDto.chapterId,
    );
    return {
      message: 'Tạo bài học thành công',
      lesson: { id: lesson.LessonID, name: lesson.LessonName },
    };
  }

  @Patch(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Cập nhật bài học (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của bài học cần cập nhật' })
  @ApiResponse({ status: 200, description: 'Cập nhật bài học thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async updateLesson(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    const lesson = await this.lessonsService.updateLesson(
      id,
      updateLessonDto.lessonName,
    );
    return { message: 'Cập nhật bài học thành công', lesson };
  }

  @Delete(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Xóa bài học (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của bài học cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa bài học thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async deleteLesson(@Param('id') id: string) {
    await this.lessonsService.deleteLesson(id);
    return { message: 'Xóa bài học thành công' };
  }
}
