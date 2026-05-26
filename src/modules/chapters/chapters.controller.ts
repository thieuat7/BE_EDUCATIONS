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
import { ChaptersService } from './chapters.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@ApiTags('Chapters')
@ApiBearerAuth()
@UseAuth()
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chương theo môn học' })
  @ApiQuery({
    name: 'subjectId',
    required: true,
    description: 'ID của môn học',
  })
  @ApiResponse({ status: 200, description: 'Danh sách chương thành công' })
  @ApiResponse({ status: 400, description: 'Thiếu tham số subjectId' })
  async listChapters(@Query('subjectId') subjectId: string) {
    if (!subjectId) {
      throw new BadRequestException('The subjectId parameter is required');
    }
    const chapters = await this.chaptersService.getChaptersBySubject(subjectId);

    const formatted = chapters.map((chapter) => ({
      id: chapter.ChapterID,
      name: chapter.ChapterName,
      subjectId: chapter.SubjectID,
    }));

    return { chapters: formatted, total: formatted.length };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Lấy tổng quan tất cả chương kèm số lượng bài học' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tổng quan chương thành công',
  })
  async listChaptersSummary() {
    const chapters = await this.chaptersService.getAllChaptersWithLessonCount();
    return { chapters, total: chapters.length };
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Lấy danh sách chương chi tiết theo môn học (kèm số bài học)',
  })
  @ApiQuery({
    name: 'subjectId',
    required: true,
    description: 'ID của môn học',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chương chi tiết thành công',
  })
  @ApiResponse({ status: 400, description: 'Thiếu tham số subjectId' })
  async listChaptersDetailed(@Query('subjectId') subjectId: string) {
    if (!subjectId) {
      throw new BadRequestException('The subjectId parameter is required');
    }
    const allChapters =
      await this.chaptersService.getAllChaptersWithLessonCount();

    const chapters = allChapters.filter(
      (chapter: any) => chapter.subjectId === subjectId,
    );

    return { success: true, chapters, total: chapters.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một chương' })
  @ApiParam({ name: 'id', description: 'ID của chương' })
  @ApiResponse({ status: 200, description: 'Thông tin chương thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chương' })
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
  @ApiOperation({ summary: 'Tạo chương mới (Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo chương thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
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
  @ApiOperation({ summary: 'Cập nhật chương (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của chương cần cập nhật' })
  @ApiResponse({ status: 200, description: 'Cập nhật chương thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chương' })
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
  @ApiOperation({ summary: 'Xóa chương (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của chương cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa chương thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chương' })
  async deleteChapter(@Param('id') id: string) {
    await this.chaptersService.deleteChapter(id);
    return { message: 'Xóa chương thành công' };
  }
}
