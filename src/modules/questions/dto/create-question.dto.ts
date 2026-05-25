import {
  IsString,
  IsInt,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, KnowledgeType } from '../entities/question.entity';
import { ChoiceDto } from './choice-question.dto';

export class CreateQuestionDto {
  @IsString()
  content: string;

  @IsInt()
  skillId: number;

  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @IsEnum(KnowledgeType)
  knowledgeType: KnowledgeType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  @ArrayMinSize(2, { message: 'Phải có ít nhất 2 đáp án' })
  choices: ChoiceDto[];
}
