import { Entity, Column, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { Chapter } from './chapter.entity';
import { Skill } from './skill.entity';

@Entity({ name: 'Lesson' })
export class Lesson {
  @PrimaryColumn({ length: 50 })
  LessonID: string;

  @Column({ length: 255 })
  LessonName: string;

  @Column({ length: 50 })
  ChapterID: string;

  @ManyToOne(() => Chapter, (chapter) => chapter.lessons, { onDelete: 'NO ACTION' })
  Chapter: Chapter;

  @OneToMany(() => Skill, (skill) => skill.Lesson)
  skills: Skill[];
}