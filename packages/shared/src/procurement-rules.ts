import { z } from 'zod';

export const ProcurementMethodSchema = z.enum([
  'SPECIFIC_METHOD',
  'SELECTIVE',
  'E_BIDDING',
  'OTHER',
]);
export type ProcurementMethod = z.infer<typeof ProcurementMethodSchema>;

export const PROCUREMENT_METHOD_LABELS_TH: Record<ProcurementMethod, string> = {
  SPECIFIC_METHOD: 'วิธีเฉพาะเจาะจง',
  SELECTIVE: 'วิธีคัดเลือก',
  E_BIDDING: 'วิธีประกาศเชิญชวน (e-bidding)',
  OTHER: 'อื่น ๆ',
};

export interface ProcurementThresholdTier {
  method: ProcurementMethod;
  labelTh: string;
  /** Inclusive upper bound in baht; null = no upper limit */
  max: number | null;
}

export interface RequiredDocSpec {
  key: string;
  labelTh: string;
  required: boolean;
}

export const ChecklistItemSchema = z.object({
  key: z.string(),
  labelTh: z.string(),
  required: z.boolean(),
  present: z.boolean(),
  documentId: z.string().nullable(),
  templateAvailable: z.boolean(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ChecklistResponseSchema = z.object({
  prId: z.string(),
  amount: z.number(),
  amountSource: z.enum(['selected_quotation', 'items_estimate', 'none']),
  method: ProcurementMethodSchema,
  methodLabel: z.string(),
  matchedTier: z
    .object({
      method: ProcurementMethodSchema,
      labelTh: z.string(),
      max: z.number().nullable(),
    })
    .nullable(),
  totalRequired: z.number(),
  totalPresent: z.number(),
  complete: z.boolean(),
  docs: z.array(ChecklistItemSchema),
});
export type ChecklistResponse = z.infer<typeof ChecklistResponseSchema>;
