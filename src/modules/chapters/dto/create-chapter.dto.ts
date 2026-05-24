import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateChapterDto {
  @IsString()
  @IsNotEmpty({ message: 'Chapter ID is required' })
  @MaxLength(50)
  chapterId: string;

  @IsString()
  @IsNotEmpty({ message: 'Chapter name is required' })
  @MaxLength(100)
  chapterName: string;

  @IsString()
  @IsNotEmpty({ message: 'Subject ID is required' })
  @MaxLength(50)
  subjectId: string;
}
