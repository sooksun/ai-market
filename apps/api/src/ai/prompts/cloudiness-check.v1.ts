import type Anthropic from '@anthropic-ai/sdk';

export const CLOUDINESS_CHECK_FEW_SHOT_TH = `ตัวอย่างการตรวจคำขอซื้อ:

INPUT:
{
  "title": "ขอซื้อเครื่องพิมพ์",
  "reason": "ใช้งาน",
  "items": [
    { "ordinal": 1, "name": "เครื่องพิมพ์", "quantity": 2, "unit": "เครื่อง", "specifications": [] }
  ]
}
OUTPUT (tool input):
{
  "flags": [
    {
      "itemOrdinal": null,
      "type": "REASON_MISSING",
      "severity": "MEDIUM",
      "message": "เหตุผลความจำเป็น \"ใช้งาน\" สั้นเกินไป ไม่ระบุว่าใช้กับงานใด ปริมาณงาน หรือเหตุที่ของเดิมไม่พอ",
      "suggestion": "ระบุภารกิจที่ต้องใช้ ปริมาณงานต่อเดือน และของเดิมมีอายุ/สภาพอย่างไร"
    },
    {
      "itemOrdinal": 1,
      "type": "AMBIGUOUS_SPEC",
      "severity": "HIGH",
      "message": "รายการ \"เครื่องพิมพ์\" ไม่ระบุชนิด (สี/ขาวดำ) ความเร็ว ปริมาณงาน การเชื่อมต่อ — เปรียบเทียบราคาไม่เป็นธรรม",
      "suggestion": "เพิ่มสเปก: ชนิด ความเร็วขั้นต่ำ การเชื่อมต่อ การรับประกัน"
    }
  ],
  "overallSeverity": "HIGH"
}

INPUT:
{
  "title": "ขอซื้อกระดาษ A4",
  "reason": "สำหรับงานธุรการประจำเดือน ต้องใช้พิมพ์เอกสารราชการประมาณ 5 รีม/เดือน คงเหลือในคลังพร้อมเบิกจ่ายเพียง 1 รีม",
  "items": [
    {
      "ordinal": 1,
      "name": "กระดาษถ่ายเอกสาร A4",
      "quantity": 20,
      "unit": "รีม",
      "specifications": [
        { "key": "น้ำหนัก", "value": "ไม่น้อยกว่า 70 แกรม" },
        { "key": "ความขาว", "value": "ไม่น้อยกว่า 90%" }
      ]
    }
  ]
}
OUTPUT (tool input):
{
  "flags": [],
  "overallSeverity": "LOW"
}

INPUT:
{
  "title": "ขอซื้อโน้ตบุ๊ก",
  "reason": "ใช้สำหรับงานธุรการสำนักงาน",
  "items": [
    {
      "ordinal": 1,
      "name": "โน้ตบุ๊ก Lenovo ThinkPad X1",
      "quantity": 3,
      "unit": "เครื่อง",
      "specifications": [
        { "key": "รุ่น", "value": "X1 Carbon Gen 11" }
      ]
    }
  ]
}
OUTPUT (tool input):
{
  "flags": [
    {
      "itemOrdinal": 1,
      "type": "BRAND_LOCK",
      "severity": "HIGH",
      "message": "ระบุยี่ห้อ Lenovo และรุ่น X1 Carbon Gen 11 — เข้าข่ายล็อกสเปก ขัดหลักจัดซื้อภาครัฐ",
      "suggestion": "ปรับเป็นคุณลักษณะขั้นต่ำ เช่น CPU ไม่ต่ำกว่า ... RAM ไม่ต่ำกว่า ... รับประกันไม่น้อยกว่า ... ปี"
    }
  ],
  "overallSeverity": "HIGH"
}
`;

export const cloudinessCheckTool: Anthropic.Tool = {
  name: 'assess_cloudiness',
  description: 'ตรวจหาความคลุมเครือ/สเปกล็อกยี่ห้อ/เหตุผลขาดในคำขอซื้อ และส่งกลับ flag เป็น JSON',
  input_schema: {
    type: 'object',
    properties: {
      flags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            itemOrdinal: {
              type: ['integer', 'null'],
              description: 'ลำดับรายการที่ flag (null = ทั้ง PR)',
            },
            type: {
              type: 'string',
              enum: [
                'AMBIGUOUS_SPEC',
                'BRAND_LOCK',
                'REASON_MISSING',
                'CLASSIFICATION_UNCERTAIN',
                'OTHER',
              ],
            },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            message: { type: 'string' },
            suggestion: { type: 'string' },
          },
          required: ['type', 'severity', 'message'],
        },
      },
      overallSeverity: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        description: 'ระดับความเสี่ยงรวมของคำขอนี้',
      },
    },
    required: ['flags', 'overallSeverity'],
  },
};
