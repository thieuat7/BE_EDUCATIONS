import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty({ message: 'Skill name is required' })
  @MaxLength(255)
  skillName: string;

  @IsString()
  @IsNotEmpty({ message: 'Lesson ID is required' })
  @MaxLength(50)
  lessonId: string;
}
