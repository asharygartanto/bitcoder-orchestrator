import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { CrawlUrlDto, BulkCrawlUrlDto } from './dto/crawl.dto';

export interface CrawlJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  mode: 'depth' | 'full';
  seedUrl: string;
  sessionId: string;
  contextId: string;
  organizationId: string;
  totalFound: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    url: string;
    documentId: string;
    title: string;
    contentLength: number;
    status: 'success' | 'error';
    error?: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

@Injectable()
export class NewsCrawlService {
  private readonly logger = new Logger(NewsCrawlService.name);
  private readonly MAX_PAGES_FULL_CRAWL = 500;
  private crawlJobs = new Map<string, CrawlJob>();

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async crawlUrl(dto: CrawlUrlDto, organizationId: string) {
    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';

    this.logger.log(`Crawling URL: ${dto.url}`);

    const html = await this.fetchPage(dto.url);
    const article = this.extractArticle(html, dto.url);

    if (!article.content || article.content.length < 50) {
      throw new BadRequestException(`Konten terlalu pendek atau tidak ditemukan di ${dto.url}`);
    }

    const content = this.buildDocument(dto, article);

    const fileName = this.sanitizeFileName(dto.title || article.title || 'untitled') + '.txt';
    const documentName = `[CRAWL] ${dto.title || article.title}`;

    const { data } = await firstValueFrom(
      this.httpService.post(`${ragUrl}/api/documents/upload`, null, {
        params: {
          file_name: fileName,
          document_id: `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          document_name: documentName,
          context_id: dto.contextId,
          organization_id: organizationId,
        },
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );

    return {
      success: true,
      url: dto.url,
      title: article.title || dto.title,
      contentLength: article.content.length,
      author: article.author,
      publishDate: article.publishDate,
      result: data,
    };
  }

  async bulkCrawl(dto: BulkCrawlUrlDto, organizationId: string) {
    const results: any[] = [];

    for (const item of dto.items) {
      try {
        const result = await this.crawlUrl(item, organizationId);
        results.push({ ...result, url: item.url, status: 'success' });
      } catch (err: any) {
        results.push({ url: item.url, status: 'error', error: err.message });
      }
    }

    return {
      total: dto.items.length,
      success: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    };
  }

  async crawlAndIndex(dto: CrawlUrlDto, organizationId: string, userId: string) {
    const crawlMode = dto.crawlMode || 'single';
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (crawlMode === 'single') {
      const result = await this.crawlAndIndexSingle(dto, organizationId, userId, sessionId);
      return { ...result, pagesCrawled: 1, mode: 'single', sessionId };
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const job: CrawlJob = {
      id: jobId,
      status: 'running',
      mode: crawlMode as 'depth' | 'full',
      seedUrl: dto.url,
      sessionId,
      contextId: dto.contextId,
      organizationId,
      totalFound: 1,
      processed: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      startedAt: new Date(),
    };

    this.crawlJobs.set(jobId, job);

    this.processMultiCrawl(dto, organizationId, userId, job).catch((err) => {
      this.logger.error(`Crawl job ${jobId} failed: ${err.message}`);
      job.status = 'failed';
      job.error = err.message;
      job.completedAt = new Date();
    });

    return {
      async: true,
      jobId,
      sessionId,
      mode: crawlMode,
      seedUrl: dto.url,
      message: `Crawl ${crawlMode === 'depth' ? `kedalaman ${dto.maxDepth || 1} tingkat` : 'penuh'} dimulai di background`,
    };
  }

  getJobStatus(jobId: string): CrawlJob {
    const job = this.crawlJobs.get(jobId);
    if (!job) throw new NotFoundException('Crawl job tidak ditemukan');
    return job;
  }

  async deleteCrawlSession(contextId: string, organizationId: string, sessionId: string) {
    const docs = await this.prisma.document.findMany({
      where: {
        contextId,
        organizationId,
        name: { contains: `[CRAWL:${sessionId}]` },
      },
    });

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';

    for (const doc of docs) {
      try {
        await firstValueFrom(
          this.httpService.delete(`${ragUrl}/api/documents/delete`, {
            data: { document_id: doc.id, context_id: contextId, organization_id: organizationId },
          }),
        );
      } catch {}
      await this.prisma.document.delete({ where: { id: doc.id } }).catch(() => {});
    }

    return { deleted: docs.length };
  }

  private async crawlAndIndexSingle(dto: CrawlUrlDto, organizationId: string, userId: string, sessionId: string) {
    const html = await this.fetchPage(dto.url);
    const article = this.extractArticle(html, dto.url);

    if (!article.content || article.content.length < 50) {
      throw new BadRequestException(`Konten terlalu pendek atau tidak ditemukan di ${dto.url}`);
    }

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    const documentName = `[CRAWL:${sessionId}] ${dto.url}`;

    const documentId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const textContent = this.buildDocument(dto, article);

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    const buffer = Buffer.from(textContent, 'utf-8');
    form.append('file', buffer, { filename: 'article.txt', contentType: 'text/plain' });
    form.append('document_id', documentId);
    form.append('document_name', documentName);
    form.append('context_id', dto.contextId);
    form.append('organization_id', organizationId);

    const { data } = await firstValueFrom(
      this.httpService.post(`${ragUrl}/api/documents/upload`, form, {
        headers: form.getHeaders(),
        timeout: 120000,
      }),
    );

    await this.prisma.document.create({
      data: {
        id: documentId,
        name: documentName,
        originalName: 'article.txt',
        fileType: 'text/plain',
        fileSize: Buffer.byteLength(textContent, 'utf-8'),
        contextId: dto.contextId,
        organizationId,
        uploadedById: userId,
        status: 'PROCESSING',
      },
    });

    return {
      success: true,
      documentId,
      documentName,
      url: dto.url,
      title: article.title || dto.title,
      contentLength: article.content.length,
      author: article.author,
      publishDate: article.publishDate,
      uploadResult: data,
    };
  }

  private async processMultiCrawl(dto: CrawlUrlDto, organizationId: string, userId: string, job: CrawlJob) {
    const maxPages = job.mode === 'full' ? this.MAX_PAGES_FULL_CRAWL : 500;
    const maxDepth = job.mode === 'depth' ? (dto.maxDepth || 1) : 999;
    const baseUrl = this.getBaseUrl(dto.url);

    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [{ url: dto.url, depth: 0 }];

    this.logger.log(`Starting ${job.mode} crawl from ${dto.url} (maxDepth=${maxDepth}, maxPages=${maxPages}, sessionId=${job.sessionId})`);

    while (queue.length > 0 && visited.size < maxPages && job.status === 'running') {
      const batchSize = Math.min(3, maxPages - visited.size);
      const batch = queue.splice(0, batchSize);
      const filtered = batch.filter(({ url }) => !visited.has(url));

      if (filtered.length === 0) continue;

      await Promise.all(filtered.map(async ({ url, depth }) => {
        if (visited.has(url)) return;
        visited.add(url);

        try {
          const html = await this.fetchPage(url);
          const article = this.extractArticle(html, url);

          if (!article.content || article.content.length < 50) {
            job.results.push({ url, documentId: '', title: article.title || url, contentLength: 0, status: 'error', error: 'Konten terlalu pendek' });
            job.processed++;
            job.failed++;
            return;
          }

          const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
          const documentId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const documentName = `[CRAWL:${job.sessionId}] ${url}`;

          const textContent = this.buildDocument({ ...dto, url, title: dto.title || article.title }, article);

          const FormData = (await import('form-data')).default;
          const form = new FormData();
          const buffer = Buffer.from(textContent, 'utf-8');
          form.append('file', buffer, { filename: 'article.txt', contentType: 'text/plain' });
          form.append('document_id', documentId);
          form.append('document_name', documentName);
          form.append('context_id', dto.contextId);
          form.append('organization_id', organizationId);

          await firstValueFrom(
            this.httpService.post(`${ragUrl}/api/documents/upload`, form, {
              headers: form.getHeaders(),
              timeout: 120000,
            }),
          );

          await this.prisma.document.create({
            data: {
              id: documentId,
              name: documentName,
              originalName: 'article.txt',
              fileType: 'text/plain',
              fileSize: Buffer.byteLength(textContent, 'utf-8'),
              contextId: dto.contextId,
              organizationId,
              uploadedById: userId,
              status: 'PROCESSING',
            },
          });

          job.results.push({ url, documentId, title: article.title || url, contentLength: article.content.length, status: 'success' });
          job.succeeded++;

          if (depth < maxDepth) {
            const links = this.extractInternalLinks(html, baseUrl);
            for (const link of links) {
              if (!visited.has(link) && !queue.some((q) => q.url === link)) {
                queue.push({ url: link, depth: depth + 1 });
              }
            }
            job.totalFound = visited.size + queue.length;
          }
        } catch (err: any) {
          job.results.push({ url, documentId: '', title: url, contentLength: 0, status: 'error', error: err.message });
          job.failed++;
        }

        job.processed++;
      }));
    }

    job.status = job.status === 'running' ? 'completed' : job.status;
    job.completedAt = new Date();
    this.logger.log(`Crawl job ${job.id} done: ${job.succeeded}/${job.processed} pages`);
  }

  private extractInternalLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const resolved = new URL(href, baseUrl).href;
        const resolvedBase = new URL(baseUrl);

        if (resolved.startsWith(`${resolvedBase.protocol}//${resolvedBase.hostname}`)) {
          const cleanUrl = resolved.split('#')[0].split('?')[0];
          if (cleanUrl.match(/\.(html?|php|aspx?|json|xml|css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|mp4|mp3)$/i)) return;
          links.add(cleanUrl);
        }
      } catch {}
    });

    return Array.from(links);
  }

  private getBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return url;
    }
  }

  private async fetchPage(url: string): Promise<string> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BitcoderBot/1.0; +https://bitcoder.ai)',
            Accept: 'text/html,application/xhtml+xml',
          },
          maxRedirects: 5,
        }),
      );
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (err: any) {
      throw new BadRequestException(`Gagal mengambil URL ${url}: ${err.message}`);
    }
  }

  private extractArticle(html: string, url: string) {
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, iframe, noscript, [role="navigation"], [role="banner"]').remove();

    const title = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text().trim()
      || '';

    const author = $('meta[name="author"]').attr('content')
      || $('meta[property="article:author"]').attr('content')
      || $('[rel="author"]').text().trim()
      || '';

    const publishDate = $('meta[property="article:published_time"]').attr('content')
      || $('time[datetime]').attr('datetime')
      || $('meta[name="date"]').attr('content')
      || '';

    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content-body',
      '.news-content',
      '.article-body',
      'main',
      '#content',
      '.content',
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 100) {
        content = el.text().trim();
        break;
      }
    }

    if (!content || content.length < 100) {
      content = $('body').text().trim();
    }

    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { title, author, publishDate, content };
  }

  private buildDocument(dto: CrawlUrlDto, article: { title: string; author: string; publishDate: string; content: string }): string {
    const parts: string[] = [];

    parts.push(`# ${dto.title || article.title || 'Untitled'}`);
    parts.push('');
    parts.push(`Sumber: ${dto.url}`);
    if (article.author) parts.push(`Penulis: ${article.author}`);
    if (article.publishDate) parts.push(`Tanggal: ${article.publishDate}`);
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(article.content);

    return JSON.stringify({
      text: parts.join('\n'),
      source_type: 'crawl',
      source_url: dto.url,
    });
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);
  }
}
