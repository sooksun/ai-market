import { z } from 'zod';

export const BudgetMovementTypeSchema = z.enum([
  'ALLOCATE',
  'HOLD',
  'RELEASE',
  'COMMIT',
  'SPEND',
  'ADJUST',
]);
export type BudgetMovementType = z.infer<typeof BudgetMovementTypeSchema>;

export const BUDGET_MOVEMENT_LABELS_TH: Record<BudgetMovementType, string> = {
  ALLOCATE: 'จัดสรร',
  HOLD: 'กันงบ',
  RELEASE: 'ปลดกัน',
  COMMIT: 'ผูกพัน',
  SPEND: 'จ่ายจริง',
  ADJUST: 'ปรับปรุง',
};

export const FiscalYearSchema = z.coerce.number().int().min(2500).max(2700);

// ─── Project ──────────────────────────────
export const CreateProjectSchema = z.object({
  code: z.string().min(1).max(32).nullable().optional(),
  name: z.string().min(1).max(255),
  fiscalYear: FiscalYearSchema,
  active: z.boolean().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ─── BudgetSource ──────────────────────────────
export const CreateBudgetSourceSchema = z.object({
  code: z.string().min(1).max(32).nullable().optional(),
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(64),
  fiscalYear: FiscalYearSchema,
  totalAmount: z.coerce.number().nonnegative(),
  active: z.boolean().optional(),
});
export type CreateBudgetSourceInput = z.infer<typeof CreateBudgetSourceSchema>;

export const UpdateBudgetSourceSchema = CreateBudgetSourceSchema.partial();
export type UpdateBudgetSourceInput = z.infer<typeof UpdateBudgetSourceSchema>;

// ─── Budget allocation ──────────────────────────────
export const AllocateBudgetSchema = z.object({
  projectId: z.string().min(1),
  budgetSourceId: z.string().min(1),
  fiscalYear: FiscalYearSchema,
  amount: z.coerce.number().nonnegative(),
  notes: z.string().max(500).nullable().optional(),
});
export type AllocateBudgetInput = z.infer<typeof AllocateBudgetSchema>;

export const UpdateBudgetAllocationSchema = z.object({
  amount: z.coerce.number().nonnegative(),
  notes: z.string().max(500).nullable().optional(),
});
export type UpdateBudgetAllocationInput = z.infer<typeof UpdateBudgetAllocationSchema>;

export const BudgetBalanceSchema = z.object({
  budgetId: z.string(),
  projectId: z.string(),
  budgetSourceId: z.string(),
  fiscalYear: z.number(),
  allocated: z.string(),
  held: z.string(),
  committed: z.string(),
  spent: z.string(),
  available: z.string(),
});
export type BudgetBalance = z.infer<typeof BudgetBalanceSchema>;
