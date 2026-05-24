import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@UseAuth()
@Controller('lessons') // 💡 Đã đổi từ 'api/baihoc' sang 'lessons'
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  async listLessons(@Query('chapterId') chapterId: string | string[]) {
    if (!chapterId) {
      throw new BadRequestException('The chapterId parameter is required');
    }

    // NestJS xử lý query array tự động nếu truyền dạng ?chapterId=1&chapterId=2
    const chapterIds = Array.isArray(chapterId) ? chapterId : [chapterId];
    const lessons = await this.lessonsService.getLessonsByChapters(chapterIds);

    // Sử dụng đúng tên thuộc tính trong Lesson Entity
    const formatted = lessons.map((lesson) => ({
      id: lesson.LessonID,
      name: lesson.LessonName,
      chapterId: lesson.ChapterID,
    }));

    return { success: true, lessons: formatted, total: formatted.length };
  }

  @Get('summary')
  async listLessonsSummary() {
    const lessons = await this.lessonsService.getAllLessonsWithSkillCount();
    return { success: true, lessons, total: lessons.length };
  }

  @Get(':id')
  async getLesson(@Param('id') id: string) {
    const lesson = await this.lessonsService.getLessonById(id);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return {
      success: true,
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
  async createLesson(@Body() createLessonDto: CreateLessonDto) {
    const lesson = await this.lessonsService.createLesson(
      createLessonDto.lessonId,
      createLessonDto.lessonName,
      createLessonDto.chapterId,
    );

    return {
      success: true,
      message: 'Lesson created successfully',
      lesson: { id: lesson.LessonID, name: lesson.LessonName },
    };
  }

  @Put(':id')
  @UseAuth('Admin')
  async updateLesson(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    const lesson = await this.lessonsService.updateLesson(
      id,
      updateLessonDto.lessonName,
    );
    return { success: true, lesson };
  }

  @Delete(':id')
  @UseAuth('Admin')
  async deleteLesson(@Param('id') id: string) {
    await this.lessonsService.deleteLesson(id);
    return { success: true, message: 'Lesson deleted successfully' };
  }
}
