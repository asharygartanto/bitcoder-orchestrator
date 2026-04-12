import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'PT Maju Jaya' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'pt-maju-jaya', required: false })
  @IsString()
  @IsOptional()
  slug?: string;
}
