import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString({ message: 'Tên không hợp lệ' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  fullName: string;

  @IsString({ message: 'Mật khẩu không hợp lệ' })
  @MinLength(6, { message: 'Mật khẩu phải ít nhất 6 ký tự' })
  password: string;
}
