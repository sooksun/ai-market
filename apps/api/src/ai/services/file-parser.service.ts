import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { ParseItemsInputType } from '@ai-market/shared';

const MAX_TEXT_BYTES = 200_000;
const MAX_ROWS = 500;

export interface ParsedFileResult {
  type: ParseItemsInputType;
  content: string;
}

@Injectable()
export class FileParserService {
  async parse(file: Express.Multer.File): Promise<ParsedFileResult> {
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const mime = file.mimetype ?? '';

    if (
      ext === 'xlsx' ||
      ext === 'xls' ||
      mime.includes('spreadsheetml') ||
      mime === 'application/vnd.ms-excel'
    ) {
      return { type: 'excel', content: await this.parseExcel(file.buffer) };
    }

    if (ext === 'csv' || mime === 'text/csv' || mime === 'application/csv') {
      return { type: 'csv', content: this.normalizeText(file.buffer) };
    }

    if (mime.startsWith('text/') || ext === 'txt') {
      return { type: 'csv', content: this.normalizeText(file.buffer) };
    }

    throw new BadRequestException({
      code: 'UNSUPPORTED_FILE_TYPE',
      message: `ไม่รองรับไฟล์ชนิดนี้ (รองรับเฉพาะ .xlsx .xls .csv .txt)`,
      details: { ext, mime },
    });
  }

  private normalizeText(buffer: Buffer): string {
    const text = buffer.toString('utf8').replace(/^﻿/, '');
    return this.truncate(text);
  }

  private async parseExcel(buffer: Buffer): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    // exceljs types use a pre-Node-22 Buffer, conflict with Buffer<ArrayBufferLike>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException({
        code: 'EMPTY_WORKBOOK',
        message: 'ไม่พบ worksheet ในไฟล์ Excel',
      });
    }

    const rows: string[] = [];
    let rowCount = 0;
    sheet.eachRow({ includeEmpty: false }, (row) => {
      if (rowCount >= MAX_ROWS) return;
      const values = row.values as unknown[];
      const cells = values
        .slice(1)
        .map((v) => this.cellToString(v))
        .map((s) => s.replace(/\t|\r?\n/g, ' ').trim());
      if (cells.some((c) => c !== '')) {
        rows.push(cells.join('\t'));
        rowCount++;
      }
    });

    if (rows.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_WORKBOOK',
        message: 'ไม่พบข้อมูลใน Excel',
      });
    }

    return this.truncate(rows.join('\n'));
  }

  private cellToString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
      const v = value as { text?: unknown; result?: unknown; richText?: { text: string }[] };
      if (Array.isArray(v.richText)) {
        return v.richText.map((r) => r.text).join('');
      }
      if (typeof v.text === 'string') return v.text;
      if (v.result != null) return String(v.result);
    }
    return String(value);
  }

  private truncate(text: string): string {
    const buf = Buffer.from(text, 'utf8');
    if (buf.byteLength <= MAX_TEXT_BYTES) return text;
    return buf.toString('utf8', 0, MAX_TEXT_BYTES) + '\n... [truncated]';
  }
}
