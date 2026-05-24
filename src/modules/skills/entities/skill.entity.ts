import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Lesson } from '@modules/lessons/entities/lesson.entity';
import { Question } from '@modules/questions/entities/question.entity';

@Entity({ name: 'Skill' })
export class Skill {
  @PrimaryGeneratedColumn()
  SkillID: number;

  @Column({ length: 255 })
  SkillName: string;

  @Column({ length: 50 })
  LessonID: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.skills, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'LessonID' })
  Lesson: Lesson;

  @OneToMany(() => Question, (question) => question.Skill)
  questions: Question[];
}
