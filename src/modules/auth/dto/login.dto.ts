import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString({ message: 'Mật khẩu không hợp lệ' })
  @MinLength(6, { message: 'Mật khẩu phải ít nhất 6 ký tự' })
  password: string;
}
