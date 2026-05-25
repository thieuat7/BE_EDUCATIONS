import { IsString, IsBoolean } from 'class-validator';

export class ChoiceDto {
  @IsString()
  content: string;

  @IsBoolean()
  isCorrect: boolean;
}
