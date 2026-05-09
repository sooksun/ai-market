import type Anthropic from '@anthropic-ai/sdk';

export const AUDIT_SCAN_FEW_SHOT_TH = `งานคือตรวจสอบย้อนหลัง (audit) ชุดคำขอซื้อในระบบพัสดุโรงเรียน เพื่อหารูปแบบความเสี่ยงที่ heuristic อัตโนมัติจับไม่ได้

ขอบเขตของคุณ (qualitative pass):
- BRAND_LOCK: สเปก/ชื่อรายการ/เหตุผล มีคำที่ระบุยี่ห้อ/รุ่น/ผู้ผลิตเฉพาะหรือคุณสมบัติที่มีเฉพาะรุ่นเดียว (เช่น "MagSafe", "Ryzen 7 7840U", "Made in Japan ของ Brother")
- AMBIGUOUS_SPEC: สเปกครุภัณฑ์ราคาสูงที่ยังกว้างเกินไปจนเปรียบเทียบไม่เป็นธรรม
- REASON_MISSING: เหตุผลความจำเป็นสั้น/ทั่วไปจนไม่อธิบายภารกิจ (เช่น "ใช้งาน" "งานสำนักงาน")
- OTHER: รูปแบบที่น่าสงสัย เช่น คำขอชื่อคล้ายกันจากผู้ขอเดียวกันในช่วงสั้น, ใบเสนอราคาทุกฉบับมาจากที่อยู่ใกล้กัน, ราคาในใบเสนอราคาเป็นเลขกลม ๆ ทุกฉบับ

ห้ามทำ (ระบบมี heuristic แยก):
- INSUFFICIENT_QUOTES, PRICE_OUTLIER, VENDOR_CONCENTRATION, NEAR_THRESHOLD_SPLIT, MISSING_DOC, BUDGET_OVERRUN — ระบบจะคำนวณเองจากข้อมูลตัวเลข อย่าซ้ำ

หลัก:
- มอง pattern ข้าม PR ไม่ใช่แค่ใน PR เดียว
- อ้าง prId ของ PR ที่ flag (และ itemOrdinal ถ้ามี)
- severity: HIGH = อาจขัดระเบียบ/พบหลักฐานยี่ห้อ-รุ่น, MEDIUM = น่าสงสัยควรตรวจ, LOW = แค่สังเกต
- ถ้าไม่พบ pattern ใหม่ ให้ตอบ flags = []
- คนเป็นผู้ตัดสินใจสุดท้าย — คุณแค่เสนอ flag

ตัวอย่าง output (tool input):
{
  "flags": [
    {
      "prId": "ck_pr_03",
      "itemOrdinal": 2,
      "type": "BRAND_LOCK",
      "severity": "HIGH",
      "message": "สเปกระบุ \\"พอร์ต Lightning\\" และ \\"Apple Pencil 2 รองรับ\\" — เข้าข่ายล็อกยี่ห้อ Apple",
      "suggestion": "ปรับเป็นคุณลักษณะกลาง: ขนาดหน้าจอ, ระบบปฏิบัติการ, ความจุ, รับประกันขั้นต่ำ"
    },
    {
      "prId": "ck_pr_05",
      "itemOrdinal": null,
      "type": "OTHER",
      "severity": "MEDIUM",
      "message": "ผู้ขอคนเดียวกันสร้างคำขอ 4 ครั้งในเดือนเดียวกันชื่อคล้ายกัน — อาจเข้าข่ายซอยรายการ",
      "suggestion": "พิจารณารวมเป็นคำขอเดียวหรือชี้แจงเหตุผลที่แยก"
    }
  ],
  "summary": "พบ 2 ประเด็น: ล็อกสเปกครุภัณฑ์ 1 รายการ และพฤติกรรมซอยคำขอ 1 ราย"
}
`;

export const auditScanTool: Anthropic.Tool = {
  name: 'flag_risks',
  description:
    'ตรวจสอบเชิงคุณภาพ (qualitative) ในชุดคำขอซื้อหา pattern ความเสี่ยงข้าม PR — เน้นล็อกสเปก เหตุผลขาด พฤติกรรมน่าสงสัย',
  input_schema: {
    type: 'object',
    properties: {
      flags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            prId: {
              type: 'string',
              description: 'id ของ PR ที่ flag (อ้างจาก payload)',
            },
            itemOrdinal: {
              type: ['integer', 'null'],
              description: 'ลำดับรายการที่ flag — null = ระดับ PR',
            },
            type: {
              type: 'string',
              enum: [
                'BRAND_LOCK',
                'AMBIGUOUS_SPEC',
                'REASON_MISSING',
                'OTHER',
              ],
            },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            message: { type: 'string', maxLength: 500 },
            suggestion: { type: 'string', maxLength: 500 },
          },
          required: ['prId', 'type', 'severity', 'message'],
        },
      },
      summary: {
        type: 'string',
        description: 'สรุปภาพรวมการตรวจ 1-2 ประโยค',
        maxLength: 400,
      },
    },
    required: ['flags', 'summary'],
  },
};
