import { z } from 'zod';

export const PurchaseRequestStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'REVIEWING',
  'RETURNED',
  'APPROVED_FOR_COMPARISON',
  'IN_COMPARISON',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'IN_RECEIVING',
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
]);
export type PurchaseRequestStatus = z.infer<typeof PurchaseRequestStatusSchema>;

export const PR_STATUS_LABELS_TH: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'ร่าง',
  SUBMITTED: 'ส่งเรื่องแล้ว',
  REVIEWING: 'กำลังตรวจ',
  RETURNED: 'ส่งกลับแก้ไข',
  APPROVED_FOR_COMPARISON: 'อนุมัติเข้ารอบเปรียบเทียบ',
  IN_COMPARISON: 'อยู่ระหว่างเปรียบเทียบราคา',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  IN_RECEIVING: 'อยู่ระหว่างตรวจรับ',
  RECEIVED: 'รับของแล้ว',
  CLOSED: 'ปิดรายการ',
  CANCELLED: 'ยกเลิก',
};

export const ItemClassSchema = z.enum(['MATERIAL', 'ASSET', 'SERVICE', 'UNCLASSIFIED']);
export type ItemClass = z.infer<typeof ItemClassSchema>;

export const SpecLevelSchema = z.enum(['MUST_HAVE', 'NICE_TO_HAVE', 'INFO']);
export type SpecLevel = z.infer<typeof SpecLevelSchema>;

export const PurchaseRequestItemInputSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(50),
  unitPriceEst: z.number().nonnegative().optional(),
  rawText: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});
export type PurchaseRequestItemInput = z.infer<typeof PurchaseRequestItemInputSchema>;

export const CreatePurchaseRequestSchema = z.object({
  title: z.string().min(1).max(255),
  reason: z.string().min(1).max(5000),
  projectId: z.string().min(1).max(64).nullable().optional(),
  budgetSourceId: z.string().min(1).max(64).nullable().optional(),
  items: z.array(PurchaseRequestItemInputSchema).min(1).max(200),
});
export type CreatePurchaseRequestInput = z.infer<typeof CreatePurchaseRequestSchema>;

export const UpdatePurchaseRequestSchema = CreatePurchaseRequestSchema.partial().extend({
  items: z.array(PurchaseRequestItemInputSchema).min(1).max(200).optional(),
});
export type UpdatePurchaseRequestInput = z.infer<typeof UpdatePurchaseRequestSchema>;

export const ProjectSummarySchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string(),
  fiscalYear: z.number(),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const BudgetSourceSummarySchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string(),
  type: z.string(),
  fiscalYear: z.number(),
  totalAmount: z.string(),
});
export type BudgetSourceSummary = z.infer<typeof BudgetSourceSummarySchema>;

export const ReturnPurchaseRequestSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type ReturnPurchaseRequestInput = z.infer<typeof ReturnPurchaseRequestSchema>;
