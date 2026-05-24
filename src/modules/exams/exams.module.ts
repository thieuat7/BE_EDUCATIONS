import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerChoice } from './entities/answer-choice.entity';
import { Exam } from './entities/exam.entity';
import { Subject } from '@modules/subjects/entities/subject.entity';
import { UsersModule } from '@modules/users/users.module';
import { ExamDetail } from './entities/exam-detail.entity';
import { Result } from '@modules/results/entities/result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, ExamDetail, AnswerChoice, Subject, Result]),
    UsersModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
