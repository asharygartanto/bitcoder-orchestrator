import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSSOConfigDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['SAML', 'OIDC'] })
  @IsEnum(['SAML', 'OIDC'])
  protocol: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entryPoint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  certificate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  discoveryUrl?: string;
}
