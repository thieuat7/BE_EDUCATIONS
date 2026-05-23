import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Exam } from './exam.entity';
import { Question } from './question.entity';

@Entity({ name: 'ExamDetail' })
@Unique('UK_exam_question', ['ExamID', 'QuestionID'])
export class ExamDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ExamID: number;

  @Column()
  QuestionID: number;

  @Column({ nullable: true })
  QuestionOrder: number;

  @ManyToOne(() => Exam, (exam) => exam.examDetails, { onDelete: 'CASCADE' })
  Exam: Exam;

  @ManyToOne(() => Question, (question) => question.examDetails, { onDelete: 'NO ACTION' })
  Question: Question;
}