import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { SkillsService } from './skills.service';
import { UseAuth } from '@common/decorators/use-auth.decorator';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@UseAuth()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async listSkills() {
    const skills = await this.skillsService.getAllSkills();
    const formattedSkills = skills.map((skill) => ({
      id: skill.SkillID,
      name: skill.SkillName,
      lesson: skill.Lesson
        ? { id: skill.Lesson.LessonID, name: skill.Lesson.LessonName }
        : null,
    }));

    return {
      success: true,
      skills: formattedSkills,
      total: formattedSkills.length,
    };
  }

  @Get(':id')
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
  async createSkill(@Body() createSkillDto: CreateSkillDto) {
    // Không cần lệnh if kiểm tra thiếu dữ liệu nữa nhờ có DTO
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
  async updateSkill(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSkillDto: UpdateSkillDto,
  ) {
    const updatedSkill = await this.skillsService.updateSkill(
      id,
      updateSkillDto.skillName,
    );
    if (!updatedSkill) throw new NotFoundException('Kỹ năng không tồn tại');

    return {
      success: true,
      message: 'Cập nhật kỹ năng thành công',
      skill: { id: updatedSkill.SkillID, name: updatedSkill.SkillName },
    };
  }

  @Delete(':id')
  @UseAuth('Admin')
  async deleteSkill(@Param('id', ParseIntPipe) id: number) {
    const result = await this.skillsService.deleteSkill(id);
    if (!result) throw new NotFoundException('Kỹ năng không tồn tại');

    return { success: true, message: 'Xóa kỹ năng thành công' };
  }
}
