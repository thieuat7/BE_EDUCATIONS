import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { Chapter } from '@modules/chapters/entities/chapter.entity';
import { Skill } from '@modules/skills/entities/skill.entity';

@Entity({ name: 'Lesson' })
export class Lesson {
  @PrimaryColumn({ length: 50 })
  LessonID: string;

  @Column({ length: 255 })
  LessonName: string;

  @Column({ length: 50 })
  ChapterID: string;

  @ManyToOne(() => Chapter, (chapter) => chapter.lessons, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'ChapterID' })
  Chapter: Chapter;

  @OneToMany(() => Skill, (skill) => skill.Lesson)
  skills: Skill[];
}
