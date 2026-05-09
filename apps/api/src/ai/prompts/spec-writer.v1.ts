import type { LlmTool } from '../llm.service';

export const SPEC_WRITER_FEW_SHOT_TH = `ตัวอย่างการเขียนสเปกใหม่ที่เป็นกลาง:

ตัวอย่าง 1 — input:
{
  "name": "คอมพิวเตอร์ตั้งโต๊ะ Lenovo ThinkCentre M70t Gen 5",
  "rawSpec": "Intel Core i5-14400, RAM 16GB DDR4, SSD 512GB, จอ 24 นิ้ว, Windows 11 Pro, รับประกัน 3 ปี",
  "tone": "balanced"
}
output (tool):
{
  "specifications": [
    {"key":"หน่วยประมวลผล","value":"ไม่ต่ำกว่า 10 แกน / 16 เธรด รุ่นออกตลาด ≤ 24 เดือน","level":"MUST_HAVE"},
    {"key":"หน่วยความจำหลัก","value":"≥ 16GB DDR4-3200 (ขยายได้ ≥ 32GB)","level":"MUST_HAVE"},
    {"key":"จัดเก็บข้อมูล","value":"SSD ≥ 512GB NVMe PCIe 3.0 ขึ้นไป","level":"MUST_HAVE"},
    {"key":"จอภาพ","value":"≥ 24 นิ้ว ความละเอียด 1920×1080 IPS","level":"MUST_HAVE"},
    {"key":"พอร์ตเชื่อมต่อ","value":"USB 3.2 ≥ 4 ช่อง, HDMI/DP, RJ-45 1Gbps","level":"NICE_TO_HAVE"},
    {"key":"ระบบปฏิบัติการ","value":"Windows 11 Pro หรือเทียบเท่า","level":"MUST_HAVE"},
    {"key":"การรับประกัน","value":"≥ 3 ปี ที่หน่วยงาน (on-site)","level":"MUST_HAVE"},
    {"key":"เกณฑ์ตรวจรับ","value":"ผ่าน Stress Test ≥ 30 นาที + ทดสอบติดตั้งซอฟต์แวร์การเรียน 5 รายการ","level":"NICE_TO_HAVE"}
  ],
  "risks": [
    {"type":"BRAND_LOCK","severity":"HIGH","message":"input ระบุ 'Lenovo ThinkCentre M70t Gen 5' — เปลี่ยนเป็นคุณลักษณะเชิงเทคนิค","suggestion":"ใช้คำว่า 'หน่วยประมวลผลไม่ต่ำกว่า ...' แทน"}
  ],
  "confidence": 0.88
}

ตัวอย่าง 2 — input:
{
  "name": "ปากกาน้ำเงิน",
  "rawSpec": "ปากกาน้ำเงิน ลูกลื่น Pilot 0.5mm",
  "tone": "minimal"
}
output (tool):
{
  "specifications": [
    {"key":"ประเภท","value":"ปากกาลูกลื่น สีน้ำเงิน","level":"MUST_HAVE"},
    {"key":"ขนาดเส้น","value":"0.5 mm","level":"MUST_HAVE"}
  ],
  "risks": [
    {"type":"BRAND_LOCK","severity":"MEDIUM","message":"input ระบุ 'Pilot' — แนะนำให้ตัดออก ใช้คุณลักษณะปากกาน้ำเงินทั่วไปแทน","suggestion":"ระบุเฉพาะประเภทและขนาดเส้น"}
  ],
  "confidence": 0.92
}

หลัก:
- tone="strict" = สเปกเข้มงวด ระบุยี่ห้อขั้นต่ำของชิ้นส่วน, level เน้น MUST_HAVE
- tone="balanced" = สเปกสมดุล ผสม MUST/NICE
- tone="minimal" = สเปกขั้นต่ำที่ระเบียบกำหนด ใช้สำหรับวัสดุสิ้นเปลืองง่าย ๆ
- ใช้คำว่า "ไม่ต่ำกว่า" / "≥" / "หรือเทียบเท่า" เพื่อเปิดให้แข่งขันราคา
- ห้ามระบุยี่ห้อเฉพาะ — ตรวจคำใน lockWords (input ส่งมาให้)
- เพิ่ม "เกณฑ์ตรวจรับ" ถ้าเป็นครุภัณฑ์ราคาสูง
`;

export const specWriterTool: LlmTool = {
  name: 'rewrite_specification',
  description:
    'เขียนสเปกใหม่ให้เป็นกลาง วัดได้ ไม่ระบุยี่ห้อ และตรวจหาความเสี่ยงล็อกยี่ห้อ/สเปกคลุมเครือ',
  input_schema: {
    type: 'object',
    properties: {
      specifications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'หัวข้อสเปก เช่น "หน่วยประมวลผล" "ขนาดเส้น"',
            },
            value: {
              type: 'string',
              description:
                'ค่าสเปก เช่น "ไม่ต่ำกว่า 10 แกน / 16 เธรด รุ่นออกตลาด ≤ 24 เดือน"',
            },
            level: {
              type: 'string',
              enum: ['MUST_HAVE', 'NICE_TO_HAVE', 'INFO'],
              description: 'ระดับความสำคัญ',
            },
          },
          required: ['key', 'value', 'level'],
        },
      },
      risks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'BRAND_LOCK',
                'AMBIGUOUS_SPEC',
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
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: ['specifications', 'risks', 'confidence'],
  },
};
