import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  subjectName?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
