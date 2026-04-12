import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrawlUrlDto {
  @ApiProperty({ example: 'https://example.com/news/article-1' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'Berita Ekonomi Q1 2025' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  contextId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class BulkCrawlUrlDto {
  @ApiProperty({ type: [CrawlUrlDto] })
  @IsArray()
  items: CrawlUrlDto[];
}
