import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Question } from '@modules/questions/entities/question.entity';

@Entity({ name: 'AnswerChoice' })
export class AnswerChoice {
  @PrimaryGeneratedColumn()
  ChoiceID: number;

  @Column({ type: 'text' })
  Content: string;

  @Column({ default: false })
  IsCorrectAnswer: boolean;

  @Column()
  QuestionID: number;

  @ManyToOne(() => Question, (question) => question.answerChoices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'QuestionID' })
  Question: Question;
}
