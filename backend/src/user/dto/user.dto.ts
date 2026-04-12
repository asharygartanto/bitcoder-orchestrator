import { IsEmail, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false, enum: ['USER', 'ADMIN'] })
  @IsOptional()
  @IsEnum(['USER', 'ADMIN'])
  role?: string;
}

export class BulkCreateUsersDto {
  @ApiProperty({ type: [CreateUserDto] })
  @IsArray()
  users: CreateUserDto[];
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, enum: ['USER', 'ADMIN'] })
  @IsOptional()
  @IsEnum(['USER', 'ADMIN'])
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  password: string;
}
