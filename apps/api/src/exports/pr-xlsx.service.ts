import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PR_STATUS_LABELS_TH } from '@ai-market/shared';
import { PrService } from '../purchase-requests/pr.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class PrXlsxService {
  constructor(private pr: PrService) {}

  async render(user: AuthenticatedUser, prId: string): Promise<{ buffer: Buffer; filename: string }> {
    const pr = await this.pr.getById(user, prId);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AI Market';
    wb.created = new Date();

    // Sheet 1: header info
    const info = wb.addWorksheet('ข้อมูลคำขอ');
    info.columns = [
      { header: 'หัวข้อ', key: 'k', width: 24 },
      { header: 'ค่า', key: 'v', width: 60 },
    ];
    info.addRows([
      { k: 'เลขที่เอกสาร', v: pr.docNo ?? '— (ยังไม่ได้ส่งเรื่อง)' },
      { k: 'เรื่อง', v: pr.title },
      { k: 'สถานะ', v: PR_STATUS_LABELS_TH[pr.status] },
      { k: 'ผู้ขอ', v: `${pr.requester.fullName} <${pr.requester.email}>` },
      { k: 'เหตุผลความจำเป็น', v: pr.reason },
      { k: 'สร้างเมื่อ', v: new Date(pr.createdAt).toLocaleString('th-TH') },
      {
        k: 'ส่งเรื่องเมื่อ',
        v: pr.submittedAt ? new Date(pr.submittedAt).toLocaleString('th-TH') : '—',
      },
    ]);
    info.getRow(1).font = { bold: true };
    info.getColumn('v').alignment = { wrapText: true, vertical: 'top' };

    // Sheet 2: items
    const items = wb.addWorksheet('รายการพัสดุ');
    items.columns = [
      { header: 'ลำดับ', key: 'ordinal', width: 8 },
      { header: 'ชื่อ', key: 'name', width: 40 },
      { header: 'จำนวน', key: 'quantity', width: 10 },
      { header: 'หน่วย', key: 'unit', width: 10 },
      { header: 'ราคา/หน่วย (ประมาณ)', key: 'unitPriceEst', width: 18 },
      { header: 'รวม', key: 'total', width: 14 },
      { header: 'หมวด', key: 'class', width: 14 },
      { header: 'หมายเหตุ', key: 'notes', width: 30 },
    ];
    pr.items.forEach((it) => {
      const qty = Number(it.quantity);
      const price = it.unitPriceEst != null ? Number(it.unitPriceEst) : null;
      items.addRow({
        ordinal: it.ordinal,
        name: it.name,
        quantity: qty,
        unit: it.unit,
        unitPriceEst: price,
        total: price != null ? qty * price : null,
        class: it.classifiedType,
        notes: it.notes ?? '',
      });
    });
    items.getRow(1).font = { bold: true };
    items.getColumn('unitPriceEst').numFmt = '#,##0.00';
    items.getColumn('total').numFmt = '#,##0.00';

    // Sheet 3: specifications (one row per spec)
    const specs = wb.addWorksheet('คุณลักษณะ');
    specs.columns = [
      { header: 'ลำดับรายการ', key: 'ordinal', width: 12 },
      { header: 'ชื่อรายการ', key: 'item', width: 30 },
      { header: 'หัวข้อสเปก', key: 'key', width: 20 },
      { header: 'รายละเอียด', key: 'value', width: 50 },
      { header: 'ระดับ', key: 'level', width: 14 },
      { header: 'แหล่งที่มา', key: 'source', width: 12 },
    ];
    pr.items.forEach((it) => {
      it.specifications.forEach((s) => {
        specs.addRow({
          ordinal: it.ordinal,
          item: it.name,
          key: s.key,
          value: s.value,
          level: s.level,
          source: s.source,
        });
      });
    });
    specs.getRow(1).font = { bold: true };

    // Sheet 4: risk flags
    const risk = wb.addWorksheet('ความเสี่ยง');
    risk.columns = [
      { header: 'เวลา', key: 'createdAt', width: 22 },
      { header: 'ประเภท', key: 'type', width: 24 },
      { header: 'ระดับ', key: 'severity', width: 10 },
      { header: 'ข้อความ', key: 'message', width: 60 },
      { header: 'AI ref', key: 'invocationId', width: 26 },
      { header: 'dismiss?', key: 'dismissed', width: 12 },
    ];
    pr.riskFlags.forEach((f) => {
      risk.addRow({
        createdAt: new Date(f.createdAt).toLocaleString('th-TH'),
        type: f.type,
        severity: f.severity,
        message: f.message,
        invocationId: f.invocationId ?? '',
        dismissed: f.dismissedAt ? 'ปิดแล้ว' : 'ยังเปิด',
      });
    });
    risk.getRow(1).font = { bold: true };
    risk.getColumn('message').alignment = { wrapText: true, vertical: 'top' };

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
    const filename = `${pr.docNo ?? 'PR'}-${pr.id.slice(-6)}.xlsx`;
    return { buffer, filename };
  }
}
