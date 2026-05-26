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
    return { chapters, total: chapters.length };
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
      chapter: {
        id: chapter.ChapterID,
        name: chapter.ChapterName,
        subject: {
          id: chapter.Subject?.SubjectID,
          name: chapter.Subject?.SubjectName,
        },
      },
    };
  }

  @Post()
  @UseAuth('Admin')
  async createChapter(@Body() createChapterDto: CreateChapterDto) {
    const chapter = await this.chaptersService.createChapter(
      createChapterDto.chapterId,
      createChapterDto.chapterName,
      createChapterDto.subjectId,
    );

    return {
      message: 'Tạo chương thành công',
      chapter: {
        id: chapter.ChapterID,
        name: chapter.ChapterName,
      },
    };
  }

  @Patch(':id')
  @UseAuth('Admin')
  async updateChapter(
    @Param('id') id: string,
    @Body() updateChapterDto: UpdateChapterDto,
  ) {
    const chapter = await this.chaptersService.updateChapter(
      id,
      updateChapterDto.chapterName,
    );
    return { message: 'Cập nhật chương thành công', chapter };
  }

  @Delete(':id')
  @UseAuth('Admin')
  async deleteChapter(@Param('id') id: string) {
    await this.chaptersService.deleteChapter(id);
    return { message: 'Xóa chương thành công' };
  }
}
