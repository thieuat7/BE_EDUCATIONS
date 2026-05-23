import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Exam } from './exam.entity';
import { ResultDetail } from './result-detail.entity';

@Entity({ name: 'Result' })
export class Result {
  @PrimaryGeneratedColumn()
  ResultID: number;

  @Column()
  UserID: number;

  @Column()
  ExamID: number;

  @Column({ type: 'float', nullable: true })
  Score: number;

  @Column({ nullable: true })
  TimeTaken: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  DateTaken: Date;

  @ManyToOne(() => User, (user) => user.results, { onDelete: 'CASCADE' })
  User: User;

  @ManyToOne(() => Exam, (exam) => exam.results, { onDelete: 'CASCADE' })
  Exam: Exam;

  @OneToMany(() => ResultDetail, (detail) => detail.Result)
  resultDetails: ResultDetail[];
}