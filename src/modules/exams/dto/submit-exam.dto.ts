import { IsNotEmpty, IsObject, IsPositive, IsInt } from 'class-validator';

export class SubmitExamDto {
  @IsNotEmpty()
  @IsObject()
  answers: Record<number, number>;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  timeSpent: number;
}
