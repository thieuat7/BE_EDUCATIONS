import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Skill } from '@modules/skills/entities/skill.entity';
import { AnswerChoice } from '@modules/exams/entities/answer-choice.entity';
import { ExamDetail } from '@modules/exams/entities/exam-detail.entity';
import { ResultDetail } from '@modules/results/entities/result-detail.entity';

export enum Difficulty {
  DE = 'De',
  TRUNG_BINH = 'TrungBinh',
  KHO = 'Kho',
}

export enum KnowledgeType {
  KHAI_NIEM = 'KhaiNiem',
  DINH_LY = 'DinhLy',
  TINH_CHAT = 'TinhChat',
  DANG_BAI_TAP = 'DangBaiTap',
}

@Entity({ name: 'Question' })
export class Question {
  @PrimaryGeneratedColumn()
  QuestionID: number;

  @Column({ type: 'text' })
  Content: string;

  @Column({ type: 'enum', enum: Difficulty, nullable: true })
  Difficulty: Difficulty;

  @Column({ type: 'enum', enum: KnowledgeType })
  KnowledgeType: KnowledgeType;

  @Column()
  SkillID: number;

  @ManyToOne(() => Skill, (skill) => skill.questions, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'SkillID' })
  Skill: Skill;

  @OneToMany(() => AnswerChoice, (choice) => choice.Question)
  answerChoices: AnswerChoice[];

  @OneToMany(() => ExamDetail, (detail) => detail.Question)
  examDetails: ExamDetail[];

  @OneToMany(() => ResultDetail, (detail) => detail.Question)
  resultDetails: ResultDetail[];
}
