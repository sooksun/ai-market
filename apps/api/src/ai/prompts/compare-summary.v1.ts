import type { LlmTool } from '../llm.service';

export const COMPARE_SUMMARY_FEW_SHOT_TH = `งานคือสรุปและแนะนำแผนการซื้อจากตารางเปรียบเทียบใบเสนอราคา

หลักการ:
- พิจารณา 4 มิติ: ราคารวม (รวมค่าส่ง), ความตรงสเปก (FULL > PARTIAL > MISMATCH), คะแนนผู้ขาย, จำนวนรายการที่ครอบคลุม
- เสนอ 2 แผนเสมอ: best_overall (ผู้ขายเดียวรวมทุกรายการ ถ้าทำได้) + best_per_item (เลือกราคาต่ำสุดแต่ละรายการ ผู้ขายต่างกันได้)
- เปรียบเทียบสองแผน: ส่วนต่างราคา · ความซับซ้อน (จำนวนผู้ขายที่ต้องสั่ง) · ความเสี่ยง
- ห้ามใช้ข้อมูลภายนอก ใช้เฉพาะที่ผู้ใช้ส่งมาในตาราง
- คะแนน confidence ต้องสมเหตุผล: 0.85+ มั่นใจสูง, 0.6-0.8 มีข้อสังเกต, ต่ำกว่า 0.5 ข้อมูลไม่เพียงพอ
- คน(เจ้าหน้าที่พัสดุ)เป็นผู้ตัดสินใจสุดท้าย

ตัวอย่าง output (tool):
{
  "bestOverall": {
    "quotationId": "ck_xxx",
    "reason": "ราคารวมต่ำสุด (฿111,200) สเปกตรงครบ คะแนนร้าน 4.7",
    "totalAmount": 111200,
    "concerns": []
  },
  "bestPerItem": {
    "linePicks": [
      {"itemId": "it_1", "quotationId": "ck_yyy", "unitPrice": 13200, "vendorName": "ร้าน ทีเค"},
      {"itemId": "it_2", "quotationId": "ck_xxx", "unitPrice": 4500, "vendorName": "บริษัท เอสไอเอส"}
    ],
    "totalAmount": 107000,
    "vendorCount": 2,
    "concerns": ["ร้าน ทีเค คะแนน 3.6 ค่อนข้างต่ำ — แนะนำตรวจประวัติเพิ่ม"]
  },
  "comparison": {
    "savings": 4200,
    "savingsPct": 3.8,
    "recommendation": "best_overall",
    "rationale": "ส่วนต่าง 3.8% ไม่คุ้มกับการแยกซื้อ 2 ร้าน + ความเสี่ยงคะแนนร้าน"
  },
  "warnings": [],
  "confidence": 0.86
}
`;

export const compareSummaryTool: LlmTool = {
  name: 'summarize_comparison',
  description:
    'สรุปและแนะนำแผนการสั่งซื้อจากตารางเปรียบเทียบใบเสนอราคา (ผู้ใช้เป็นผู้ตัดสินใจสุดท้าย)',
  input_schema: {
    type: 'object',
    properties: {
      bestOverall: {
        type: 'object',
        description: 'แผนซื้อจากผู้ขายเดียว — null ถ้าไม่มีผู้ขายที่เสนอครบทุกรายการ',
        properties: {
          quotationId: { type: 'string' },
          reason: { type: 'string' },
          totalAmount: { type: 'number' },
          concerns: { type: 'array', items: { type: 'string' } },
        },
        required: ['quotationId', 'reason', 'totalAmount', 'concerns'],
      },
      bestPerItem: {
        type: 'object',
        description: 'แผนแยกซื้อรายผู้ขาย เลือกราคาต่ำสุดต่อรายการ',
        properties: {
          linePicks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                itemId: { type: 'string' },
                quotationId: { type: 'string' },
                unitPrice: { type: 'number' },
                vendorName: { type: 'string' },
              },
              required: ['itemId', 'quotationId', 'unitPrice', 'vendorName'],
            },
          },
          totalAmount: { type: 'number' },
          vendorCount: { type: 'number' },
          concerns: { type: 'array', items: { type: 'string' } },
        },
        required: ['linePicks', 'totalAmount', 'vendorCount', 'concerns'],
      },
      comparison: {
        type: 'object',
        properties: {
          savings: {
            type: 'number',
            description: 'จำนวนเงินที่ประหยัดได้จาก best_per_item เทียบ best_overall (อาจติดลบ)',
          },
          savingsPct: { type: 'number' },
          recommendation: {
            type: 'string',
            enum: ['best_overall', 'best_per_item', 'inconclusive'],
          },
          rationale: { type: 'string' },
        },
        required: ['recommendation', 'rationale'],
      },
      warnings: {
        type: 'array',
        items: { type: 'string' },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: ['comparison', 'warnings', 'confidence'],
  },
};
