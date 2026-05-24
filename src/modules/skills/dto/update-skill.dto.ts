import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateSkillDto {
  @IsString()
  @IsNotEmpty({ message: 'Skill name is required' })
  @MaxLength(255)
  skillName: string;
}
