import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  organizationSlug?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
