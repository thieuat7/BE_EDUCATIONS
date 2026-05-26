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
import { SubjectsService } from './subjects.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
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
  @UseAuth('Admin') // 💡 Tự động kiểm tra quyền Admin
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
  @UseAuth('Admin') // 💡 Tự động kiểm tra quyền Admin
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
  @UseAuth('Admin') // 💡 Tự động kiểm tra quyền Admin
  async deleteSubject(@Param('id') id: string) {
    await this.subjectsService.deleteSubject(id);
    return { message: 'Xóa môn học thành công' };
  }

  @Get(':id/hierarchy')
  async getHierarchy(@Param('id') id: string) {
    const hierarchy = await this.subjectsService.getContentHierarchy(id);
    if (!hierarchy) throw new NotFoundException('Môn học không tồn tại');

    return { hierarchy };
  }
}
