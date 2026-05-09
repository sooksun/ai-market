import { z } from 'zod';
import { RoleSchema } from './role';

export const ApprovalWorkflowStatusSchema = z.enum([
  'IN_PROGRESS',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);
export type ApprovalWorkflowStatus = z.infer<typeof ApprovalWorkflowStatusSchema>;

export const APPROVAL_WORKFLOW_STATUS_LABELS_TH: Record<ApprovalWorkflowStatus, string> = {
  IN_PROGRESS: 'อยู่ระหว่างอนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิก',
};

export const ApprovalStepStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETURNED',
  'SKIPPED',
]);
export type ApprovalStepStatus = z.infer<typeof ApprovalStepStatusSchema>;

export const APPROVAL_STEP_STATUS_LABELS_TH: Record<ApprovalStepStatus, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  RETURNED: 'ส่งกลับ',
  SKIPPED: 'ข้าม',
};

export const ApprovalDecisionSchema = z.object({
  comment: z.string().max(2000).nullable().optional(),
});
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalRejectSchema = z.object({
  comment: z.string().min(1).max(2000),
});
export type ApprovalRejectInput = z.infer<typeof ApprovalRejectSchema>;

export const ApprovalReturnSchema = z.object({
  comment: z.string().min(1).max(2000),
});
export type ApprovalReturnInput = z.infer<typeof ApprovalReturnSchema>;

export const WorkflowStepTemplateSchema = z.object({
  title: z.string().min(1).max(120),
  approverRole: RoleSchema,
});
export type WorkflowStepTemplate = z.infer<typeof WorkflowStepTemplateSchema>;

export const WorkflowTemplateSchema = z.object({
  steps: z.array(WorkflowStepTemplateSchema).min(1).max(10),
});
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;
