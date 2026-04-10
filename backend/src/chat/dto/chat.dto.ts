import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  contextId?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  contextId?: string;
}
