import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NewsCrawlController } from './news-crawl.controller';
import { NewsCrawlService } from './news-crawl.service';

@Module({
  imports: [HttpModule],
  controllers: [NewsCrawlController],
  providers: [NewsCrawlService],
  exports: [NewsCrawlService],
})
export class NewsCrawlModule {}
