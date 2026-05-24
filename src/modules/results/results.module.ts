import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

import { Result } from './entities/result.entity';
import { ResultDetail } from './entities/result-detail.entity';
import { Exam } from '@modules/exams/entities/exam.entity';
import { Question } from '@modules/questions/entities/question.entity';
import { AnswerChoice } from '@modules/exams/entities/answer-choice.entity';
import { User } from '@modules/users/entities/user.entity';
import { Subject } from '@modules/subjects/entities/subject.entity';
import { Skill } from '@modules/skills/entities/skill.entity';
import { AiModule } from '@modules/ai-services/ai-services.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Result,
      ResultDetail,
      Exam,
      Question,
      AnswerChoice,
      User,
      Subject,
      Skill,
    ]),
    AiModule,
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
