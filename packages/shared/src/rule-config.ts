import { z } from 'zod';

export const RuleConfigKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, {
    message: 'key ต้องเป็นตัวพิมพ์เล็ก ขีดล่าง ตัวเลข เริ่มด้วยตัวอักษร',
  });

export const RuleConfigSchema = z.object({
  id: z.string(),
  key: z.string(),
  type: z.string(),
  value: z.unknown(),
  description: z.string().nullable(),
  schoolId: z.string().nullable(),
  updatedById: z.string().nullable(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
export type RuleConfig = z.infer<typeof RuleConfigSchema>;

export const CreateRuleConfigSchema = z.object({
  key: RuleConfigKeySchema,
  type: z.string().min(1).max(32),
  value: z.unknown(),
  description: z.string().max(500).nullable().optional(),
});
export type CreateRuleConfigInput = z.infer<typeof CreateRuleConfigSchema>;

export const UpdateRuleConfigSchema = z.object({
  type: z.string().min(1).max(32).optional(),
  value: z.unknown().optional(),
  description: z.string().max(500).nullable().optional(),
});
export type UpdateRuleConfigInput = z.infer<typeof UpdateRuleConfigSchema>;
