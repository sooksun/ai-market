import { z } from 'zod';

export const ReceivingStatusSchema = z.enum([
  'IN_PROGRESS',
  'COMPLETE',
  'PARTIAL',
  'REJECTED',
  'CANCELLED',
]);
export type ReceivingStatus = z.infer<typeof ReceivingStatusSchema>;

export const RECEIVING_STATUS_LABELS_TH: Record<ReceivingStatus, string> = {
  IN_PROGRESS: 'กำลังตรวจรับ',
  COMPLETE: 'รับครบ',
  PARTIAL: 'รับบางส่วน',
  REJECTED: 'ไม่รับ (คืนผู้ขาย)',
  CANCELLED: 'ยกเลิก',
};

export const ItemReceiveConditionSchema = z.enum([
  'GOOD',
  'DAMAGED',
  'WRONG_SPEC',
  'SHORT_QUANTITY',
  'NOT_RECEIVED',
]);
export type ItemReceiveCondition = z.infer<typeof ItemReceiveConditionSchema>;

export const RECEIVE_CONDITION_LABELS_TH: Record<ItemReceiveCondition, string> = {
  GOOD: 'สภาพดี',
  DAMAGED: 'ชำรุด',
  WRONG_SPEC: 'ไม่ตรงสเปก',
  SHORT_QUANTITY: 'จำนวนไม่ครบ',
  NOT_RECEIVED: 'ไม่ได้รับของ',
};

export const RecordReceivingItemSchema = z.object({
  quantityReceived: z.coerce.number().nonnegative().nullable().optional(),
  condition: ItemReceiveConditionSchema.optional().default('GOOD'),
  conditionNotes: z.string().max(2000).nullable().optional(),
});
export type RecordReceivingItemInput = z.infer<typeof RecordReceivingItemSchema>;

export const FinalizeReceivingSchema = z.object({
  decision: z.enum(['COMPLETE', 'PARTIAL', 'REJECTED']),
  comment: z.string().max(2000).nullable().optional(),
});
export type FinalizeReceivingInput = z.infer<typeof FinalizeReceivingSchema>;
