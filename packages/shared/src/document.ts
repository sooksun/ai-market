import { z } from 'zod';

export const DocumentCategorySchema = z.enum([
  'memo',
  'tor',
  'comparison',
  'evaluation',
  'po',
  'other',
]);
export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;

export const DOCUMENT_CATEGORY_LABELS_TH: Record<DocumentCategory, string> = {
  memo: 'บันทึกข้อความ',
  tor: 'รายละเอียดคุณลักษณะ',
  comparison: 'ตารางเปรียบเทียบ',
  evaluation: 'รายงานพิจารณา',
  po: 'ใบสั่งซื้อภายใน',
  other: 'อื่น ๆ',
};

export const UpdateDocumentTemplateSchema = z.object({
  nameTh: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: DocumentCategorySchema.optional(),
  htmlContent: z.string().min(1).max(200_000).optional(),
  active: z.boolean().optional(),
});
export type UpdateDocumentTemplateInput = z.infer<typeof UpdateDocumentTemplateSchema>;

export const RenderDocumentSchema = z.object({
  templateKey: z.string().min(1).max(64),
});
export type RenderDocumentInput = z.infer<typeof RenderDocumentSchema>;
