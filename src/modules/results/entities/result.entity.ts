import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Exam } from '@modules/exams/entities/exam.entity';
import { ResultDetail } from '@modules/results/entities/result-detail.entity';

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

  // 💡 BƯỚC 2: Chỉ dẫn cho TypeORM sử dụng cột 'UserID' làm khóa ngoại cho quan hệ User
  @ManyToOne(() => User, (user) => user.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserID' })
  User: User;

  // 💡 BƯỚC 2: Chỉ dẫn cho TypeORM sử dụng cột 'ExamID' làm khóa ngoại cho quan hệ Exam
  @ManyToOne(() => Exam, (exam) => exam.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ExamID' })
  Exam: Exam;

  @OneToMany(() => ResultDetail, (detail) => detail.Result)
  resultDetails: ResultDetail[];
}
