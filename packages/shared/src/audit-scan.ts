import { z } from 'zod';

export const RiskTypeSchema = z.enum([
  'AMBIGUOUS_SPEC',
  'BRAND_LOCK',
  'PRICE_OUTLIER',
  'INSUFFICIENT_QUOTES',
  'MISSING_DOC',
  'BUDGET_OVERRUN',
  'REASON_MISSING',
  'CLASSIFICATION_UNCERTAIN',
  'VENDOR_CONCENTRATION',
  'NEAR_THRESHOLD_SPLIT',
  'OTHER',
]);
export type RiskTypeValue = z.infer<typeof RiskTypeSchema>;

export const RiskSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RiskSeverityValue = z.infer<typeof RiskSeveritySchema>;

export const RISK_TYPE_LABELS_TH: Record<RiskTypeValue, string> = {
  AMBIGUOUS_SPEC: 'สเปกคลุมเครือ',
  BRAND_LOCK: 'ล็อกยี่ห้อ/รุ่น',
  PRICE_OUTLIER: 'ราคาผิดปกติ',
  INSUFFICIENT_QUOTES: 'ใบเสนอราคาไม่ครบ',
  MISSING_DOC: 'เอกสารขาด',
  BUDGET_OVERRUN: 'ใช้เกินงบ',
  REASON_MISSING: 'เหตุผลขาด',
  CLASSIFICATION_UNCERTAIN: 'หมวดพัสดุไม่ชัด',
  VENDOR_CONCENTRATION: 'ผู้ขายกระจุกตัว',
  NEAR_THRESHOLD_SPLIT: 'อาจซอยให้ต่ำกว่าวงเงิน',
  OTHER: 'อื่น ๆ',
};

export const RISK_SEVERITY_LABELS_TH: Record<RiskSeverityValue, string> = {
  LOW: 'ต่ำ',
  MEDIUM: 'กลาง',
  HIGH: 'สูง',
};

// ─────────────────────────────────────────────
// Audit scan API
// ─────────────────────────────────────────────

export const AuditScanInputSchema = z.object({
  prIds: z.array(z.string().min(1)).max(50).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  statuses: z.array(z.string()).max(15).optional(),
  useAi: z.boolean().optional().default(true),
});
export type AuditScanInput = z.infer<typeof AuditScanInputSchema>;

// AI tool output (qualitative pass)
export const AuditScanAiFlagSchema = z.object({
  prId: z.string(),
  itemOrdinal: z.number().int().nullable().optional(),
  type: z.enum(['BRAND_LOCK', 'AMBIGUOUS_SPEC', 'REASON_MISSING', 'OTHER']),
  severity: RiskSeveritySchema,
  message: z.string().max(2000),
  suggestion: z.string().max(2000).optional(),
});
export type AuditScanAiFlag = z.infer<typeof AuditScanAiFlagSchema>;

export const AuditScanAiToolOutputSchema = z.object({
  flags: z.array(AuditScanAiFlagSchema),
  summary: z.string().max(2000),
});
export type AuditScanAiToolOutput = z.infer<typeof AuditScanAiToolOutputSchema>;

// Final response from POST /audit/scan
export const AuditScanFlagSchema = z.object({
  id: z.string(),
  purchaseRequestId: z.string().nullable(),
  itemId: z.string().nullable(),
  type: RiskTypeSchema,
  severity: RiskSeveritySchema,
  message: z.string(),
  detail: z.unknown().optional(),
  modelVersion: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type AuditScanFlag = z.infer<typeof AuditScanFlagSchema>;

export const AuditScanResponseSchema = z.object({
  scanId: z.string(),
  prCount: z.number(),
  flagCount: z.number(),
  aiInvocationId: z.string().nullable(),
  flags: z.array(AuditScanFlagSchema),
  bySeverity: z.object({
    HIGH: z.number(),
    MEDIUM: z.number(),
    LOW: z.number(),
  }),
  byType: z.record(z.string(), z.number()),
  notes: z.string().nullable(),
});
export type AuditScanResponse = z.infer<typeof AuditScanResponseSchema>;

// Listing

export const AuditScanListItemSchema = z.object({
  id: z.string(),
  ranBy: z.object({ id: z.string(), fullName: z.string() }),
  prCount: z.number(),
  flagCount: z.number(),
  scope: z.unknown(),
  createdAt: z.string(),
});
export type AuditScanListItem = z.infer<typeof AuditScanListItemSchema>;

export const AuditFlagsQuerySchema = z.object({
  severity: RiskSeveritySchema.optional(),
  type: RiskTypeSchema.optional(),
  prId: z.string().optional(),
  open: z.coerce.boolean().optional(),
  scanId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type AuditFlagsQuery = z.infer<typeof AuditFlagsQuerySchema>;
