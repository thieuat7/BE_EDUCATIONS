import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm';
import { Chapter } from '@modules/chapters/entities/chapter.entity';

@Entity({ name: 'Subject' })
export class Subject {
  @PrimaryColumn({ length: 50 })
  SubjectID: string;

  @Column({ length: 100, unique: true })
  SubjectName: string;

  @Column({ type: 'text', nullable: true })
  Description: string;

  @OneToMany(() => Chapter, (chapter) => chapter.Subject)
  chapters: Chapter[];
}
