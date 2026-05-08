export const PARSE_ITEMS_FEW_SHOT_TH = `ตัวอย่างการแยกรายการ:

INPUT:
"ปากกาน้ำเงิน 10 ด้าม กระดาษ A4 5 รีม"
OUTPUT (tool input):
{
  "items": [
    { "name": "ปากกาน้ำเงิน", "quantity": 10, "unit": "ด้าม", "rawText": "ปากกาน้ำเงิน 10 ด้าม", "confidence": 0.97 },
    { "name": "กระดาษ A4", "quantity": 5, "unit": "รีม", "rawText": "กระดาษ A4 5 รีม", "confidence": 0.97 }
  ],
  "warnings": [],
  "unparsedSegments": []
}

INPUT:
"เครื่องพิมพ์ 2 ตัวกับหมึกพิมพ์"
OUTPUT (tool input):
{
  "items": [
    {
      "name": "เครื่องพิมพ์",
      "quantity": 2,
      "unit": "เครื่อง",
      "rawText": "เครื่องพิมพ์ 2 ตัว",
      "confidence": 0.78,
      "notes": "หน่วยเดิม 'ตัว' ปรับเป็น 'เครื่อง' ตามมาตรฐานพัสดุ"
    },
    {
      "name": "หมึกพิมพ์",
      "quantity": 1,
      "unit": "ชุด",
      "rawText": "หมึกพิมพ์",
      "confidence": 0.40,
      "notes": "ไม่ระบุจำนวนชัดเจน ตั้ง default 1"
    }
  ],
  "warnings": [
    { "type": "AMBIGUOUS_QUANTITY", "message": "หมึกพิมพ์ไม่ระบุจำนวน", "refRawText": "หมึกพิมพ์" }
  ],
  "unparsedSegments": []
}

INPUT:
"ขอซื้อโน้ตบุ๊ก Lenovo X1 จำนวน 3 เครื่อง"
OUTPUT (tool input):
{
  "items": [
    {
      "name": "เครื่องคอมพิวเตอร์โน้ตบุ๊ก",
      "quantity": 3,
      "unit": "เครื่อง",
      "rawText": "โน้ตบุ๊ก Lenovo X1 จำนวน 3 เครื่อง",
      "confidence": 0.85,
      "notes": "ผู้ใช้ระบุยี่ห้อ/รุ่นเฉพาะ ปรับเป็นชื่อรายการกลาง สเปกควรกำหนดเป็นคุณลักษณะขั้นต่ำ"
    }
  ],
  "warnings": [],
  "unparsedSegments": []
}
`;

import type Anthropic from '@anthropic-ai/sdk';

export const parseItemsTool: Anthropic.Tool = {
  name: 'extract_items',
  description: 'แยกรายการพัสดุจากข้อความ/ตาราง และส่งกลับเป็น JSON ตาม schema',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'ชื่อรายการพัสดุ (ภาษาไทยเป็นหลัก ไม่ระบุยี่ห้อ)' },
            quantity: { type: 'number', description: 'จำนวน' },
            unit: { type: 'string', description: 'หน่วยนับ' },
            unitPriceEst: {
              type: 'number',
              description: 'ราคาประมาณการต่อหน่วย (บาท) ถ้า input ระบุไว้',
            },
            rawText: { type: 'string', description: 'ข้อความต้นฉบับที่อ้างอิง' },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'คะแนนความมั่นใจ',
            },
            notes: { type: 'string', description: 'หมายเหตุเพิ่มเติม (optional)' },
          },
          required: ['name', 'quantity', 'unit', 'rawText', 'confidence'],
        },
      },
      warnings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['AMBIGUOUS_QUANTITY', 'AMBIGUOUS_UNIT', 'MIXED_ITEMS', 'OCR_LOW_QUALITY'],
            },
            message: { type: 'string' },
            refRawText: { type: 'string' },
          },
          required: ['type', 'message'],
        },
      },
      unparsedSegments: {
        type: 'array',
        items: { type: 'string' },
        description: 'ข้อความส่วนที่ไม่สามารถแยกเป็นรายการพัสดุได้',
      },
    },
    required: ['items', 'warnings', 'unparsedSegments'],
  },
};
