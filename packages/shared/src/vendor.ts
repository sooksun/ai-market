import { z } from 'zod';

export const QuotationStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'REVIEWING',
  'SELECTED',
  'REJECTED',
  'WITHDRAWN',
]);
export type QuotationStatus = z.infer<typeof QuotationStatusSchema>;

export const QUOTATION_STATUS_LABELS_TH: Record<QuotationStatus, string> = {
  DRAFT: 'ร่าง',
  SUBMITTED: 'ส่งแล้ว',
  REVIEWING: 'กำลังตรวจ',
  SELECTED: 'เลือกแล้ว',
  REJECTED: 'ไม่เลือก',
  WITHDRAWN: 'ถอน',
};

export const QuotationSpecMatchSchema = z.enum([
  'FULL',
  'PARTIAL',
  'MISMATCH',
  'UNKNOWN',
]);
export type QuotationSpecMatch = z.infer<typeof QuotationSpecMatchSchema>;

export const SPEC_MATCH_LABELS_TH: Record<QuotationSpecMatch, string> = {
  FULL: 'ครบ',
  PARTIAL: 'บางส่วน',
  MISMATCH: 'ไม่ตรง',
  UNKNOWN: 'ไม่ระบุ',
};

// ─── Vendor ────────────────────────────────
export const CreateVendorSchema = z.object({
  name: z.string().min(1).max(255),
  taxId: z.string().max(20).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('').transform(() => null)),
  address: z.string().max(2000).nullable().optional(),
  rating: z.coerce.number().min(0).max(5).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
});
export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;

export const UpdateVendorSchema = CreateVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;

// ─── Quotation ─────────────────────────────
export const QuotationItemInputSchema = z.object({
  purchaseRequestItemId: z.string().min(1),
  unitPrice: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().nonnegative().nullable().optional(),
  specMatch: QuotationSpecMatchSchema.optional().default('UNKNOWN'),
  specMatchDetail: z.string().max(2000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type QuotationItemInput = z.infer<typeof QuotationItemInputSchema>;

export const CreateQuotationSchema = z.object({
  vendorId: z.string().min(1),
  source: z.string().min(1).max(255),
  shippingFee: z.coerce.number().nonnegative().optional().default(0),
  notes: z.string().max(2000).nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  items: z.array(QuotationItemInputSchema).min(1).max(200),
});
export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

export const UpdateQuotationSchema = CreateQuotationSchema.partial().extend({
  items: z.array(QuotationItemInputSchema).min(1).max(200).optional(),
});
export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;

export const SelectQuotationSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type SelectQuotationInput = z.infer<typeof SelectQuotationSchema>;
