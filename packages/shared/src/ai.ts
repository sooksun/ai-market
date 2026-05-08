import { z } from 'zod';

export const ParseItemsInputTypeSchema = z.enum(['text', 'csv', 'excel']);
export type ParseItemsInputType = z.infer<typeof ParseItemsInputTypeSchema>;

export const ParseItemsInputSchema = z.object({
  type: ParseItemsInputTypeSchema,
  content: z.string().min(1).max(20000),
  hint: z.string().max(500).optional(),
  sourceFilename: z.string().max(255).optional(),
});
export type ParseItemsInput = z.infer<typeof ParseItemsInputSchema>;

export const ParsedItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPriceEst: z.number().optional(),
  rawText: z.string(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const ParseItemsWarningTypeSchema = z.enum([
  'AMBIGUOUS_QUANTITY',
  'AMBIGUOUS_UNIT',
  'MIXED_ITEMS',
  'OCR_LOW_QUALITY',
]);

export const ParseItemsWarningSchema = z.object({
  type: ParseItemsWarningTypeSchema,
  message: z.string(),
  refRawText: z.string().optional(),
});
export type ParseItemsWarning = z.infer<typeof ParseItemsWarningSchema>;

export const ParseItemsToolOutputSchema = z.object({
  items: z.array(ParsedItemSchema),
  warnings: z.array(ParseItemsWarningSchema),
  unparsedSegments: z.array(z.string()),
});
export type ParseItemsToolOutput = z.infer<typeof ParseItemsToolOutputSchema>;

export const ParseItemsResponseSchema = ParseItemsToolOutputSchema.extend({
  invocationId: z.string(),
});
export type ParseItemsResponse = z.infer<typeof ParseItemsResponseSchema>;

// ─────────────────────────────────────────────
// Cloudiness check
// ─────────────────────────────────────────────

export const CloudinessFlagTypeSchema = z.enum([
  'AMBIGUOUS_SPEC',
  'BRAND_LOCK',
  'REASON_MISSING',
  'CLASSIFICATION_UNCERTAIN',
  'OTHER',
]);

export const CloudinessFlagSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const CloudinessFlagSchema = z.object({
  itemOrdinal: z.number().int().nullable().optional(),
  type: CloudinessFlagTypeSchema,
  severity: CloudinessFlagSeveritySchema,
  message: z.string(),
  suggestion: z.string().optional(),
});
export type CloudinessFlag = z.infer<typeof CloudinessFlagSchema>;

export const CloudinessToolOutputSchema = z.object({
  flags: z.array(CloudinessFlagSchema),
  overallSeverity: CloudinessFlagSeveritySchema,
});
export type CloudinessToolOutput = z.infer<typeof CloudinessToolOutputSchema>;

export const CheckCloudinessInputSchema = z.object({
  purchaseRequestId: z.string().min(1),
});
export type CheckCloudinessInput = z.infer<typeof CheckCloudinessInputSchema>;

export const CheckCloudinessResponseSchema = CloudinessToolOutputSchema.extend({
  invocationId: z.string(),
  flagsCreated: z.number(),
});
export type CheckCloudinessResponse = z.infer<typeof CheckCloudinessResponseSchema>;

export const DismissRiskFlagSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type DismissRiskFlagInput = z.infer<typeof DismissRiskFlagSchema>;

// ─────────────────────────────────────────────
// Spec Writer
// ─────────────────────────────────────────────

export const SpecToneSchema = z.enum(['balanced', 'strict', 'minimal']);
export type SpecTone = z.infer<typeof SpecToneSchema>;

export const SPEC_TONE_LABELS_TH: Record<SpecTone, string> = {
  balanced: 'สมดุล',
  strict: 'เข้มงวด',
  minimal: 'ขั้นต่ำ',
};

export const SpecLevelOutputSchema = z.enum(['MUST_HAVE', 'NICE_TO_HAVE', 'INFO']);
export type SpecLevelOutput = z.infer<typeof SpecLevelOutputSchema>;

export const SpecWriterRiskSchema = z.object({
  type: z.enum(['BRAND_LOCK', 'AMBIGUOUS_SPEC', 'CLASSIFICATION_UNCERTAIN', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  message: z.string(),
  suggestion: z.string().optional(),
});
export type SpecWriterRisk = z.infer<typeof SpecWriterRiskSchema>;

export const SpecWriterSpecSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.string().min(1).max(2000),
  level: SpecLevelOutputSchema,
});
export type SpecWriterSpec = z.infer<typeof SpecWriterSpecSchema>;

export const SpecWriterToolOutputSchema = z.object({
  specifications: z.array(SpecWriterSpecSchema),
  risks: z.array(SpecWriterRiskSchema),
  confidence: z.number().min(0).max(1),
});
export type SpecWriterToolOutput = z.infer<typeof SpecWriterToolOutputSchema>;

export const SpecWriterInputSchema = z.object({
  itemId: z.string().min(1),
  tone: SpecToneSchema.optional().default('balanced'),
  rawSpec: z.string().max(2000).optional(),
});
export type SpecWriterInput = z.infer<typeof SpecWriterInputSchema>;

export const SpecWriterResponseSchema = SpecWriterToolOutputSchema.extend({
  invocationId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  tone: SpecToneSchema,
});
export type SpecWriterResponse = z.infer<typeof SpecWriterResponseSchema>;

export const ApplySpecificationsSchema = z.object({
  specifications: z
    .array(
      z.object({
        key: z.string().min(1).max(120),
        value: z.string().min(1).max(2000),
        level: SpecLevelOutputSchema.optional().default('MUST_HAVE'),
        source: z.enum(['HUMAN', 'AI']).optional().default('HUMAN'),
      }),
    )
    .min(0)
    .max(50),
});
export type ApplySpecificationsInput = z.infer<typeof ApplySpecificationsSchema>;
