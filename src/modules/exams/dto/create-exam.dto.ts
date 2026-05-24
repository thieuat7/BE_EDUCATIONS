import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExamDto {
  @IsOptional()
  @IsString()
  ExamName?: string;

  @IsInt()
  @Min(1)
  TimeLimit: number;

  @IsObject()
  ExamStructure: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  SubjectID: string;
}
