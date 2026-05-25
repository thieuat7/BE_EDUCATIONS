import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { Subject } from '@modules/subjects/entities/subject.entity';
import { Lesson } from '@modules/lessons/entities/lesson.entity';

@Entity({ name: 'Chapter' })
export class Chapter {
  @PrimaryColumn({ length: 50 })
  ChapterID: string;

  @Column({ length: 100 })
  ChapterName: string;

  @Column({ length: 50 })
  SubjectID: string;

  @ManyToOne(() => Subject, (subject) => subject.chapters, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'SubjectID' })
  Subject: Subject;

  @OneToMany(() => Lesson, (lesson) => lesson.Chapter)
  lessons: Lesson[];
}
