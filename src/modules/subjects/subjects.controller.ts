import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@ApiTags('Subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả môn học' })
  @ApiResponse({ status: 200, description: 'Danh sách môn học thành công' })
  async listSubjects() {
    const subjects = await this.subjectsService.getAllSubjects();
    const formatted = subjects.map((subject) => ({
      id: subject.SubjectID,
      name: subject.SubjectName,
      description: subject.Description,
    }));
    return { subjects: formatted, total: formatted.length };
  }

  @Get('summary')
  @UseAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy tổng quan môn học kèm số chương và bài học' })
  @ApiResponse({ status: 200, description: 'Tổng quan môn học thành công' })
  async listSubjectsSummary() {
    const subjects = await this.subjectsService.getSubjectSummary();
    const formatted = subjects.map((s) => ({
      id: s.SubjectID || s.id,
      name: s.SubjectName || s.name,
      description: s.Description || s.description,
      chapterCount: parseInt(s.chapterCount || s.chaptercount || '0', 10),
      lessonCount: parseInt(s.lessonCount || s.lessoncount || '0', 10),
    }));
    return { subjects: formatted, total: formatted.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một môn học' })
  @ApiParam({ name: 'id', description: 'ID của môn học' })
  @ApiResponse({ status: 200, description: 'Chi tiết môn học thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy môn học' })
  async getSubject(@Param('id') id: string) {
    const subject = await this.subjectsService.getSubjectById(id);
    if (!subject) throw new NotFoundException('Môn học không tồn tại');
    return {
      success: true,
      subject: {
        id: subject.SubjectID,
        name: subject.SubjectName,
        description: subject.Description,
      },
    };
  }

  @Post()
  @UseAuth('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo môn học mới (Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo môn học thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async createSubject(@Body() createSubjectDto: CreateSubjectDto) {
    const subject = await this.subjectsService.createSubject(
      createSubjectDto.subjectId,
      createSubjectDto.subjectName,
      createSubjectDto.description,
    );
    return {
      message: 'Tạo môn học thành công',
      subject: { id: subject.SubjectID, name: subject.SubjectName },
    };
  }

  @Patch(':id')
  @UseAuth('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật môn học (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của môn học cần cập nhật' })
  @ApiResponse({ status: 200, description: 'Cập nhật môn học thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy môn học' })
  async updateSubject(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const subject = await this.subjectsService.updateSubject(
      id,
      updateSubjectDto.subjectName,
      updateSubjectDto.description,
    );
    return { message: 'Cập nhật môn học thành công', subject };
  }

  @Delete(':id')
  @UseAuth('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa môn học (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của môn học cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa môn học thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy môn học' })
  async deleteSubject(@Param('id') id: string) {
    await this.subjectsService.deleteSubject(id);
    return { message: 'Xóa môn học thành công' };
  }

  @Get(':id/hierarchy')
  @ApiOperation({
    summary:
      'Lấy cây phân cấp nội dung của môn học (chương → bài học → kỹ năng)',
  })
  @ApiParam({ name: 'id', description: 'ID của môn học' })
  @ApiResponse({ status: 200, description: 'Cây phân cấp nội dung thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy môn học' })
  async getHierarchy(@Param('id') id: string) {
    const hierarchy = await this.subjectsService.getContentHierarchy(id);
    if (!hierarchy) throw new NotFoundException('Môn học không tồn tại');
    return { hierarchy };
  }
}
