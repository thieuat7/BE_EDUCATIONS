import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn, // 💡 Đã thêm import này
} from 'typeorm';
import { Subject } from '@modules/subjects/entities/subject.entity';
import { ExamDetail } from './exam-detail.entity';
import { Result } from '@modules/results/entities/result.entity';

@Entity({ name: 'Exam' })
export class Exam {
  @PrimaryGeneratedColumn()
  ExamID: number;

  @Column({ length: 100, nullable: true })
  ExamName: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  DateCreated: Date;

  @Column()
  TimeLimit: number; // phút

  @Column({ type: 'json' })
  ExamStructure: any;

  @Column({ length: 50 })
  SubjectID: string;

  @ManyToOne(() => Subject, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'SubjectID' })
  Subject: Subject;

  @OneToMany(() => ExamDetail, (detail) => detail.Exam)
  examDetails: ExamDetail[];

  @OneToMany(() => Result, (result) => result.Exam)
  results: Result[];
}
