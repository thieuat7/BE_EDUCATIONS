import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Skill } from './skill.entity';
import { AnswerChoice } from './answer-choice.entity';
import { ExamDetail } from './exam-detail.entity';
import { ResultDetail } from './result-detail.entity';

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
  Skill: Skill;

  @OneToMany(() => AnswerChoice, (choice) => choice.Question)
  answerChoices: AnswerChoice[];

  @OneToMany(() => ExamDetail, (detail) => detail.Question)
  examDetails: ExamDetail[];

  @OneToMany(() => ResultDetail, (detail) => detail.Question)
  resultDetails: ResultDetail[];
}