import { Entity, Column, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { Subject } from './subject.entity';
import { Lesson } from './lesson.entity';

@Entity({ name: 'Chapter' })
export class Chapter {
  @PrimaryColumn({ length: 50 })
  ChapterID: string;

  @Column({ length: 100 })
  ChapterName: string;

  @Column({ length: 50 })
  SubjectID: string;

  @ManyToOne(() => Subject, (subject) => subject.chapters, { onDelete: 'NO ACTION' })
  Subject: Subject;

  @OneToMany(() => Lesson, (lesson) => lesson.Chapter)
  lessons: Lesson[];
}