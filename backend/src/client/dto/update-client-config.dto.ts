import { IsOptional, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClientConfigDto {
  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  dbConfig?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  aiConfig?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  storageConfig?: Record<string, any>;
}

export class UpdateBrandingDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
