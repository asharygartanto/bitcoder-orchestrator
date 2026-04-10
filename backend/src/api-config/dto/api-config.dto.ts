import { IsString, IsOptional, IsNotEmpty, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { HttpMethod } from '@prisma/client';

export class CreateApiConfigDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsEnum(HttpMethod)
  method?: HttpMethod = HttpMethod.GET;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsObject()
  bodyTemplate?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateApiConfigDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  endpoint?: string;

  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsObject()
  bodyTemplate?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
