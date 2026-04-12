import { IsString, IsOptional, IsEnum, IsDateString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLicenseDto {
  @ApiProperty({ example: 'PT Maju Jaya' })
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'maju-jaya' })
  @IsString()
  companyAlias: string;

  @ApiProperty({ example: 'admin@ptmaju.co.id' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ required: false, example: 'IT Admin' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: ['ONE_WEEK', 'ONE_MONTH', 'ONE_YEAR', 'CUSTOM'] })
  @IsEnum(['ONE_WEEK', 'ONE_MONTH', 'ONE_YEAR', 'CUSTOM'])
  duration: string;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ required: false, example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ValidateLicenseDto {
  @ApiProperty()
  @IsString()
  licenseKey: string;
}
