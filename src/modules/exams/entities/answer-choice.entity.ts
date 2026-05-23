import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Question } from './question.entity';

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

  @ManyToOne(() => Question, (question) => question.answerChoices, { onDelete: 'CASCADE' })
  Question: Question;
}