import { z } from 'zod';

export const VoucherStatusSchema = z.enum(['PENDING', 'ISSUED', 'PAID', 'CANCELLED']);
export type VoucherStatus = z.infer<typeof VoucherStatusSchema>;

export const VOUCHER_STATUS_LABELS_TH: Record<VoucherStatus, string> = {
  PENDING: 'รอออกเลขใบสำคัญ',
  ISSUED: 'ออกเลขแล้ว · รอจ่าย',
  PAID: 'จ่ายแล้ว',
  CANCELLED: 'ยกเลิก',
};

export const PaymentMethodSchema = z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'OTHER']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PAYMENT_METHOD_LABELS_TH: Record<PaymentMethod, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอนเงิน',
  CHEQUE: 'เช็ค',
  OTHER: 'อื่น ๆ',
};

export const IssueVoucherSchema = z.object({
  voucherNumber: z.string().min(1).max(64),
  notes: z.string().max(2000).nullable().optional(),
});
export type IssueVoucherInput = z.infer<typeof IssueVoucherSchema>;

export const PayVoucherSchema = z.object({
  paidAt: z.string().datetime().optional(),
  paymentMethod: PaymentMethodSchema.optional().default('TRANSFER'),
  paymentRef: z.string().max(128).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type PayVoucherInput = z.infer<typeof PayVoucherSchema>;

export const CancelVoucherSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type CancelVoucherInput = z.infer<typeof CancelVoucherSchema>;
