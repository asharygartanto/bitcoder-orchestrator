import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { CrawlUrlDto, BulkCrawlUrlDto } from './dto/crawl.dto';

@Injectable()
export class NewsCrawlService {
  private readonly logger = new Logger(NewsCrawlService.name);

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
    const html = await this.fetchPage(dto.url);
    const article = this.extractArticle(html, dto.url);

    if (!article.content || article.content.length < 50) {
      throw new BadRequestException(`Konten terlalu pendek atau tidak ditemukan di ${dto.url}`);
    }

    const ragUrl = process.env.RAG_ENGINE_URL || 'http://localhost:8000';
    const documentName = `[CRAWL] ${dto.title || article.title}`;

    await this.deleteExistingCrawl(dto.contextId, organizationId, dto.url, ragUrl);

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

  private async deleteExistingCrawl(contextId: string, organizationId: string, url: string, ragUrl: string) {
    const existingDocs = await this.prisma.document.findMany({
      where: {
        contextId,
        organizationId,
        name: { contains: '[CRAWL]' },
      },
    });

    for (const doc of existingDocs) {
      const docUrl = doc.name.replace('[CRAWL]', '').trim();
      if (docUrl !== url && !doc.name.includes(url)) continue;

      try {
        await firstValueFrom(
          this.httpService.delete(`${ragUrl}/api/documents/delete`, {
            data: {
              document_id: doc.id,
              context_id: contextId,
              organization_id: organizationId,
            },
          }),
        );
      } catch {}
      await this.prisma.document.delete({ where: { id: doc.id } });
    }

    try {
      await firstValueFrom(
        this.httpService.delete(`${ragUrl}/api/documents/delete-crawl-by-url`, {
          data: { url, context_id: contextId, organization_id: organizationId },
        }),
      );
    } catch {}
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
