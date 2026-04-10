import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateContextDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateContextDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isActive?: boolean;
}
