import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, KnowledgeType } from '../entities/question.entity';
import { ChoiceDto } from './choice-question.dto';
export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsEnum(KnowledgeType)
  knowledgeType?: KnowledgeType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices?: ChoiceDto[];
}
