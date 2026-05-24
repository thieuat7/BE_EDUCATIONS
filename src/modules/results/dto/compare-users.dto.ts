import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class CompareUsersDto {
  @IsArray({ message: 'Danh sách userIds phải là một mảng' })
  @ArrayNotEmpty({ message: 'Danh sách userIds không được để trống' })
  @IsInt({ each: true, message: 'Mỗi userId trong mảng phải là một số nguyên' })
  userIds: number[];
}
