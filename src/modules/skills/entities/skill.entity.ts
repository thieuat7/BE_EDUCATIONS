import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Lesson } from './lesson.entity';
import { Question } from './question.entity';

@Entity({ name: 'Skill' })
export class Skill {
  @PrimaryGeneratedColumn()
  SkillID: number;

  @Column({ length: 255 })
  SkillName: string;

  @Column({ length: 50 })
  LessonID: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.skills, { onDelete: 'NO ACTION' })
  Lesson: Lesson;

  @OneToMany(() => Question, (question) => question.Skill)
  questions: Question[];
}