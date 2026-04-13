import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { NewsCrawlService } from './news-crawl.service';
import { CrawlUrlDto, BulkCrawlUrlDto } from './dto/crawl.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('news-crawl')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NewsCrawlController {
  constructor(private crawlService: NewsCrawlService) {}

  @Post('url')
  @Roles(UserRole.SUPER_ADMIN)
  async crawlUrl(@Body() dto: CrawlUrlDto, @Req() req: any) {
    const orgId = dto.organizationId || req.user.organizationId;
    return this.crawlService.crawlAndIndex(dto, orgId, req.user.id);
  }

  @Post('bulk')
  @Roles(UserRole.SUPER_ADMIN)
  async bulkCrawl(@Body() dto: BulkCrawlUrlDto, @Req() req: any) {
    return this.crawlService.bulkCrawl(dto, req.user.organizationId);
  }
}
