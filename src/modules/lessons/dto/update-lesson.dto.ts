import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateLessonDto {
  @IsString()
  @IsNotEmpty({ message: 'Lesson name is required' })
  @MaxLength(255)
  lessonName: string;
}
