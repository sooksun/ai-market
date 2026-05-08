import { z } from 'zod';

export const AuditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export const AUDIT_ACTION_LABELS_TH: Record<string, string> = {
  'auth.login': 'เข้าสู่ระบบ',
  'auth.logout': 'ออกจากระบบ',
  'purchase_request.create': 'สร้างคำขอซื้อ',
  'purchase_request.update': 'แก้ไขคำขอซื้อ',
  'purchase_request.submit': 'ส่งเรื่อง',
  'purchase_request.withdraw': 'ถอนเรื่อง',
  'purchase_request.claim': 'รับเรื่องเข้าตรวจ',
  'purchase_request.return': 'ส่งกลับแก้ไข',
  'purchase_request.approve_for_comparison': 'อนุมัติเข้ารอบเปรียบเทียบ',
  'purchase_request.dismiss_risk_flag': 'ปิด risk flag',
  'ai.parse_items': 'AI: แยกรายการ',
  'ai.check_cloudiness': 'AI: ตรวจความคลุมเครือ',
};

export const ENTITY_TYPE_LABELS_TH: Record<string, string> = {
  PurchaseRequest: 'คำขอซื้อ',
  AiInvocation: 'การเรียก AI',
  AiRiskFlag: 'risk flag',
};
