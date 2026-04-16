import { IsString, IsOptional, IsArray, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiProperty({ required: false, enum: ['single', 'depth', 'full'], default: 'single' })
  @IsOptional()
  @IsEnum(['single', 'depth', 'full'])
  crawlMode?: 'single' | 'depth' | 'full';

  @ApiProperty({ required: false, default: 1, description: 'Kedalaman link (hanya untuk mode depth)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxDepth?: number;

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
