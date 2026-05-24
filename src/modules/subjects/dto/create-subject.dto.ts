import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Subject ID is required' })
  @MaxLength(50)
  subjectId: string;

  @IsString()
  @IsNotEmpty({ message: 'Subject name is required' })
  @MaxLength(100)
  subjectName: string;

  @IsString()
  @IsOptional()
  description?: string;
}
