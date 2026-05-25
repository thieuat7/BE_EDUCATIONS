import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';
import { Skill } from '@modules/skills/entities/skill.entity';
import { AnswerChoice } from '@modules/exams/entities/answer-choice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Skill, AnswerChoice])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
