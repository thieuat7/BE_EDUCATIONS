import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Subject } from './subject.entity';
import { ExamDetail } from './exam-detail.entity';
import { Result } from './result.entity';

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
  ExamStructure: any; // Có thể định nghĩa interface riêng

  @Column({ length: 50 })
  SubjectID: string;

  @ManyToOne(() => Subject, { onDelete: 'NO ACTION' })
  Subject: Subject;

  @OneToMany(() => ExamDetail, (detail) => detail.Exam)
  examDetails: ExamDetail[];

  @OneToMany(() => Result, (result) => result.Exam)
  results: Result[];
}