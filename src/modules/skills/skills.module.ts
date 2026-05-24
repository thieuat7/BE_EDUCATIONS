import { Module } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';
import { Lesson } from '@modules/lessons/entities/lesson.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, Lesson])],
  controllers: [SkillsController],
  providers: [SkillsService],
})
export class SkillsModule {}
