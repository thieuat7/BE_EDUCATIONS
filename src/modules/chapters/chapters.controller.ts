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
import { ChaptersService } from './chapters.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@UseAuth()
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Get()
  async listChapters(@Query('subjectId') subjectId: string) {
    if (!subjectId) {
      throw new BadRequestException('The subjectId parameter is required');
    }
    const chapters = await this.chaptersService.getChaptersBySubject(subjectId);

    // Sử dụng tên thuộc tính chuẩn theo Entity của bạn (ChapterID, ChapterName)
    const formatted = chapters.map((chapter) => ({
      id: chapter.ChapterID,
      name: chapter.ChapterName,
      subjectId: chapter.SubjectID,
    }));

    return { chapters: formatted, total: formatted.length };
  }

  @Get('summary')
  async listChaptersSummary() {
    const chapters = await this.chaptersService.getAllChaptersWithLessonCount();
    return { success: true, chapters, total: chapters.length };
  }

  @Get('detailed')
  async listChaptersDetailed(@Query('subjectId') subjectId: string) {
    if (!subjectId) {
      throw new BadRequestException('The subjectId parameter is required');
    }
    const allChapters =
      await this.chaptersService.getAllChaptersWithLessonCount();

    // Lưu ý: Đảm bảo service trả về thuộc tính tên là subjectId hoặc SubjectID
    const chapters = allChapters.filter(
      (chapter: any) => chapter.subjectId === subjectId,
    );

    return { success: true, chapters, total: chapters.length };
  }

  @Get(':id')
  async getChapter(@Param('id') id: string) {
    const chapter = await this.chaptersService.getChapterById(id);
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    return {
      success: true,
      chapter: {
        id: chapter.ChapterID,
        name: chapter.ChapterName,
        subject: {
          id: chapter.Subject?.SubjectID, // Tùy thuộc vào thiết kế Subject entity của bạn
          name: chapter.Subject?.SubjectName,
        },
      },
    };
  }

  @Post()
  @UseAuth('Admin')
  async createChapter(@Body() createChapterDto: CreateChapterDto) {
    // DTO đã tự động kiểm tra dữ liệu, chúng ta không cần lệnh if(Thiếu dữ liệu) nữa
    const chapter = await this.chaptersService.createChapter(
      createChapterDto.chapterId,
      createChapterDto.chapterName,
      createChapterDto.subjectId,
    );

    return {
      success: true,
      message: 'Chapter created successfully',
      chapter: {
        id: chapter.ChapterID,
        name: chapter.ChapterName,
      },
    };
  }

  @Put(':id')
  @UseAuth('Admin')
  async updateChapter(
    @Param('id') id: string,
    @Body() updateChapterDto: UpdateChapterDto,
  ) {
    const chapter = await this.chaptersService.updateChapter(
      id,
      updateChapterDto.chapterName,
    );
    return { success: true, chapter };
  }

  @Delete(':id')
  @UseAuth('Admin')
  async deleteChapter(@Param('id') id: string) {
    await this.chaptersService.deleteChapter(id);
    return { success: true, message: 'Chapter deleted successfully' };
  }
}
