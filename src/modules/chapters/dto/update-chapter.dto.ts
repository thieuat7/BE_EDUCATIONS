import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateChapterDto {
  @IsString()
  @IsNotEmpty({ message: 'Chapter name is required' })
  @MaxLength(100)
  chapterName: string;
}
