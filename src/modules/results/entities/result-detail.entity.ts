import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Result } from './result.entity';
import { Question } from '@modules/questions/entities/question.entity';
import { AnswerChoice } from '@modules/exams/entities/answer-choice.entity';

@Entity({ name: 'ResultDetail' })
@Unique('UK_result_question', ['ResultID', 'QuestionID'])
export class ResultDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ResultID: number;

  @Column()
  QuestionID: number;

  @Column({ nullable: true })
  SelectedChoiceID: number;

  @Column({ type: 'boolean', nullable: true })
  IsCorrect: boolean;

  @ManyToOne(() => Result, (result) => result.resultDetails, {
    onDelete: 'CASCADE',
  })
  Result: Result;

  @ManyToOne(() => Question, (question) => question.resultDetails, {
    onDelete: 'NO ACTION',
  })
  Question: Question;

  @ManyToOne(() => AnswerChoice, { onDelete: 'SET NULL', nullable: true })
  SelectedChoice: AnswerChoice;
}
