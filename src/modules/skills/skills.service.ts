import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { Lesson } from '@modules/lessons/entities/lesson.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill) private skillRepo: Repository<Skill>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
  ) {}

  async createSkill(skillName: string, lessonId: string) {
    // 💡 Tìm bài học bằng trường LessonID
    const lesson = await this.lessonRepo.findOne({
      where: { LessonID: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    // 💡 Sử dụng đúng tên thuộc tính: SkillName và Lesson
    const skill = this.skillRepo.create({
      SkillName: skillName,
      Lesson: lesson,
    });

    return await this.skillRepo.save(skill);
  }

  async getAllSkills() {
    // 💡 Lấy kèm thông tin Lesson để Controller có thể map được dữ liệu
    return await this.skillRepo.find({
      relations: { Lesson: true },
      order: { SkillName: 'ASC' },
    });
  }

  async getSkillById(id: number) {
    return await this.skillRepo.findOne({
      where: { SkillID: id }, // 💡 Tìm bằng SkillID
      relations: { Lesson: true }, // 💡 Cú pháp relations mới
    });
  }

  async updateSkill(id: number, skillName: string) {
    const skill = await this.getSkillById(id);

    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại');
    }

    // 💡 Cập nhật đúng trường SkillName
    skill.SkillName = skillName;
    return await this.skillRepo.save(skill);
  }

  async deleteSkill(id: number) {
    const skill = await this.getSkillById(id);

    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại');
    }

    await this.skillRepo.remove(skill);
    return true;
  }
}
