import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty({ message: 'Lesson ID is required' })
  @MaxLength(50)
  lessonId: string;

  @IsString()
  @IsNotEmpty({ message: 'Lesson name is required' })
  @MaxLength(255)
  lessonName: string;

  @IsString()
  @IsNotEmpty({ message: 'Chapter ID is required' })
  @MaxLength(50)
  chapterId: string;
}
