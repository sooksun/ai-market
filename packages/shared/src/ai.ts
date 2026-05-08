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
