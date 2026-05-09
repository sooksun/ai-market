import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

export interface PdfRenderOptions {
  /** Filename hint shown in headers / dev logs. */
  filename?: string;
  /** A4 by default; set 'A5' / 'Letter' if needed. */
  format?: 'A4' | 'A5' | 'Letter';
  /** Margins (CSS values, e.g. '15mm'). */
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  /** Whether to include page numbers in the footer. */
  pageNumbers?: boolean;
  /** Document title for the running header. */
  headerTitle?: string;
}

const DEFAULT_MARGIN = { top: '18mm', right: '15mm', bottom: '20mm', left: '15mm' };

const FONT_INJECTION = `
<style id="aim-pdf-fonts">
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
  html, body { font-family: 'Sarabun', sans-serif; }
</style>
`;

@Injectable()
export class PdfRendererService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfRendererService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  async onModuleInit(): Promise<void> {
    // Lazy-launch on first use is fine; nothing to do up front.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => null);
      this.browser = null;
    }
  }

  /**
   * Render an HTML string into a PDF buffer. Reuses a single Chromium
   * instance for the lifetime of the Nest app to avoid the ~1s cold-start
   * per render.
   */
  async htmlToPdf(html: string, options: PdfRenderOptions = {}): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      // Inject Sarabun import on top of whatever the template already has.
      const finalHtml = this.injectFonts(html);
      await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 30_000 });
      const buffer = await page.pdf({
        format: options.format ?? 'A4',
        printBackground: true,
        margin: { ...DEFAULT_MARGIN, ...(options.margin ?? {}) },
        displayHeaderFooter: options.pageNumbers === true || !!options.headerTitle,
        headerTemplate: options.headerTitle
          ? `<div style="font-family: Sarabun, sans-serif; font-size: 9px; color: #6b7280; width: 100%; text-align: right; padding: 0 15mm;">${escapeHtml(options.headerTitle)}</div>`
          : '<div></div>',
        footerTemplate:
          options.pageNumbers === true
            ? `<div style="font-family: Sarabun, sans-serif; font-size: 9px; color: #6b7280; width: 100%; text-align: center;">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>`
            : '<div></div>',
      });
      return Buffer.from(buffer);
    } finally {
      await page.close().catch(() => null);
    }
  }

  private injectFonts(html: string): string {
    if (html.includes('id="aim-pdf-fonts"')) return html;
    if (html.includes('</head>')) {
      return html.replace('</head>', `${FONT_INJECTION}</head>`);
    }
    return `<!doctype html><html><head><meta charset="utf-8">${FONT_INJECTION}</head><body>${html}</body></html>`;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) return this.browser;
    if (this.launching) return this.launching;

    this.launching = puppeteer
      .launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=medium',
        ],
      })
      .then((b) => {
        this.browser = b;
        b.on('disconnected', () => {
          this.logger.warn('puppeteer browser disconnected — will relaunch on next render');
          this.browser = null;
        });
        return b;
      })
      .finally(() => {
        this.launching = null;
      });

    return this.launching;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
