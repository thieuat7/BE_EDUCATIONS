import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { QuestionsService } from '../questions/questions.service';

@ApiTags('Skills')
@ApiBearerAuth()
@UseAuth()
@Controller('skills')
export class SkillsController {
  constructor(
    private readonly skillsService: SkillsService,
    private readonly questionsService: QuestionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả kỹ năng' })
  @ApiResponse({ status: 200, description: 'Danh sách kỹ năng thành công' })
  async listSkills() {
    const skills = await this.skillsService.getAllSkills();
    const formattedSkills = skills.map((skill) => ({
      id: skill.SkillID,
      name: skill.SkillName,
      lesson: skill.Lesson
        ? { id: skill.Lesson.LessonID, name: skill.Lesson.LessonName }
        : null,
    }));
    return { success: true, skills: formattedSkills, total: formattedSkills.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của kỹ năng', type: Number })
  @ApiResponse({ status: 200, description: 'Chi tiết kỹ năng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỹ năng' })
  async getSkill(@Param('id', ParseIntPipe) id: number) {
    const skill = await this.skillsService.getSkillById(id);
    if (!skill) throw new NotFoundException('Kỹ năng không tồn tại');
    return {
      success: true,
      skill: {
        id: skill.SkillID,
        name: skill.SkillName,
        lesson: skill.Lesson
          ? { id: skill.Lesson.LessonID, name: skill.Lesson.LessonName }
          : null,
      },
    };
  }

  @Post()
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Tạo kỹ năng mới (Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo kỹ năng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async createSkill(@Body() createSkillDto: CreateSkillDto) {
    const newSkill = await this.skillsService.createSkill(
      createSkillDto.skillName,
      createSkillDto.lessonId,
    );
    return {
      success: true,
      message: 'Tạo kỹ năng thành công',
      skill: { id: newSkill.SkillID, name: newSkill.SkillName },
    };
  }

  @Put(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Cập nhật kỹ năng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của kỹ năng cần cập nhật', type: Number })
  @ApiResponse({ status: 200, description: 'Cập nhật kỹ năng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỹ năng' })
  async updateSkill(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSkillDto: UpdateSkillDto,
  ) {
    const updatedSkill = await this.skillsService.updateSkill(id, updateSkillDto.skillName);
    if (!updatedSkill) throw new NotFoundException('Kỹ năng không tồn tại');
    return {
      success: true,
      message: 'Cập nhật kỹ năng thành công',
      skill: { id: updatedSkill.SkillID, name: updatedSkill.SkillName },
    };
  }

  @Delete(':id')
  @UseAuth('Admin')
  @ApiOperation({ summary: 'Xóa kỹ năng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID của kỹ năng cần xóa', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa kỹ năng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kỹ năng' })
  async deleteSkill(@Param('id', ParseIntPipe) id: number) {
    const result = await this.skillsService.deleteSkill(id);
    if (!result) throw new NotFoundException('Kỹ năng không tồn tại');
    return { success: true, message: 'Xóa kỹ năng thành công' };
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Lấy danh sách câu hỏi theo kỹ năng' })
  @ApiParam({ name: 'id', description: 'ID của kỹ năng', type: Number })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Lọc theo độ khó (Easy, Medium, Hard)' })
  @ApiResponse({ status: 200, description: 'Danh sách câu hỏi thành công' })
  async getBySkill(
    @Param('skillId', ParseIntPipe) skillId: number,
    @Query('difficulty') difficulty?: string,
  ) {
    const questions = await this.questionsService.findBySkill(skillId, difficulty);
    return { success: true, questions, total: questions.length };
  }
}
