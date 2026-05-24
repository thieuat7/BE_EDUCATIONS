import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  JoinColumn, // 💡 Bổ sung import này
} from 'typeorm';
import { Exam } from './exam.entity';
import { Question } from '@modules/questions/entities/question.entity';

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

  // 💡 CHỈ DẪN 1: Gắn quan hệ Exam với cột ExamID
  @ManyToOne(() => Exam, (exam) => exam.examDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ExamID' })
  Exam: Exam;

  // 💡 CHỈ DẪN 2: Gắn quan hệ Question với cột QuestionID
  @ManyToOne(() => Question, (question) => question.examDetails, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'QuestionID' })
  Question: Question;
}
